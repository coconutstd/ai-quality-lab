# 실험 15: 프로젝트 초기 계층 — 스타터 템플릿 결과

## 측정 일시
2026-04-23

## 목표

실험 12~14로 누적된 시스템(세션 내부 Hard 차단, 컴포넌트 Skill+Audit, PR 게이트)을 **프로젝트 경계 밖으로 이식 가능한 형태**로 압축한다. 새 프로젝트에 `cp -r` 한 번 + 몇 개 wiring 단계로 세 계층이 동시에 활성화되어야 한다.

"시스템을 복제할 수 있는가"는 "규칙을 코드로 만들었는가"와 다른 차원이다. 14까지가 **이 레포에 맞는 시스템**이었다면, 15는 그게 **일반화 가능한 조각**이었는지의 증명.

## 구성 — `starter/` 번들

```
starter/
├── .claude/
│   ├── settings.json                     (hook 등록 그대로)
│   ├── hooks/
│   │   ├── guard-always-layer.mjs
│   │   ├── audit-components.mjs
│   │   └── test-guard.mjs               (config-aware 로 수정)
│   ├── rules/
│   │   ├── always-layer.mjs             (SSOT)
│   │   └── config.mjs                   (신규 — 프로젝트-로컬 설정)
│   ├── scripts/sync-rules.mjs
│   └── skills/new-component/SKILL.md   (레퍼런스 섹션 일반화)
├── .githooks/pre-push
├── .github/workflows/pr-gate.yml
├── CLAUDE.md                             (프로젝트 골격 + 생성 블록 빈 상태)
└── README.md                             (이식 단계 + 선행 조건 + 커스터마이즈 포인트)
```

## 프로젝트 종속성 3곳을 config.mjs 하나로 분리

실험 12~14 구현은 lab 레포의 구체적 경로에 의존했음. 이식 가능성을 위해 세 곳을 외부화:

| 분리 대상 | 원래 위치 | 분리 후 |
|---|---|---|
| 컴포넌트 디렉토리 | `audit-components.mjs` 의 `const ROOT = "components"` | `CONFIG.COMPONENTS_DIR` — `src/components`·`packages/ui/src` 등 모노레포 대응 |
| R3 XSS sink 화이트리스트 | `always-layer.mjs` 의 `WHITELIST_R3 = [/components\/SafeHtml\.tsx$/]` | `CONFIG.SAFE_HTML_SINK_PATHS` — 기본 빈 배열, sink 컴포넌트 생기면 경로 추가 |
| Audit 예외 컴포넌트 | 하드코드 빈 Set | `CONFIG.AUDIT_EXCLUDE` — 장식적 wrapper 같은 예외 허용 |

**설계 원칙**: SSOT(`always-layer.mjs`)는 규칙 자체만, `config.mjs` 는 프로젝트-로컬 값만. 둘을 섞지 않음. 수정 흐름도 달라짐 — 규칙 변경은 `sync:rules` 재생성 필요, config 변경은 재실행만 하면 hook이 즉시 반영.

## test-guard.mjs 가 config-aware 가 되어야 했던 이유

starter 기본값은 `SAFE_HTML_SINK_PATHS: []` (sink 없음 = 어디서도 dangerouslySetInnerHTML 금지). 원래 test-guard의 S7b 케이스는 "SafeHtml.tsx 는 통과"를 하드코딩. starter 컨텍스트에서는 **이 가정이 깨지고 테스트가 false failure**.

수정: S7b가 config를 import해서

```js
const SINK = sinkSamplePath();  // SAFE_HTML_SINK_PATHS[0] → 경로 샘플

cases = [
  ...,
  ...(SINK
    ? [{ name: "sink 경로 통과", expect: "pass", path: SINK }]
    : [{ name: "sink 없음 → 어디서도 차단", expect: "block", path: "/abs/components/AnyComponent.tsx" }]),
  ...
]
```

결과:
- **Lab 쪽 (sink = SafeHtml.tsx)**: S7b가 "configured sink 통과"로 실행 → 17/17 pass
- **Starter 쪽 (sink = [])**: S7b가 "어디서도 차단"으로 실행 → 17/17 pass
- 같은 파일, 같은 테스트 개수, 다른 의미. 양쪽 환경의 불변량을 동시에 검증.

이게 SSOT + 외부 config 분리가 실측으로 드러난 케이스. "테스트가 config를 안다"는 게 **config 계층이 정말 의미 있는 경계인지** 확인하는 리트머스.

## 적용 시뮬레이션 — `/tmp/starter-transplant`

빈 디렉토리에 `cp -a starter/. /tmp/starter-transplant/` 후 Node만으로 실행:

| 단계 | 명령 | 기대 | 실측 |
|---|---|---|---|
| 1 | `node .claude/scripts/sync-rules.mjs` | CLAUDE.md 블록 채워짐, "5개 규칙 반영" | ✅ |
| 2 | `node .claude/scripts/sync-rules.mjs --check` | idempotent, exit 0 | ✅ |
| 3 | `node .claude/hooks/test-guard.mjs` | 17/17 (starter 모드 S7b) | ✅ |
| 4 | `mkdir components && audit-components` | 0개 컴포넌트 통과 | ✅ |
| 5 | 고아 `Lonely.tsx` 생성 후 audit --strict | 누락 리포트 + exit 1 | ✅ |
| 6 | R3 동작 검증: `SAFE_HTML_SINK_PATHS: []` 상태에서 dangerouslySetInnerHTML Write payload | hook 차단 응답 | ✅ |
| 7 | `config.mjs` 에 sink 추가 후 재시도 | hook 통과 (빈 응답) | ✅ |

→ **`cp -a` + `npm run sync:rules` + `git config core.hooksPath .githooks` 세 단계로 세 계층 전부 활성화.** 의존성 설치(`npm ci`) 외의 수동 작업은 `config.mjs`에 경로 맞추기 뿐.

## Lab 쪽 후행 회귀

Starter 만들며 lab의 `always-layer.mjs`·`audit-components.mjs`·`test-guard.mjs` 를 config 소비자로 리팩터. 리팩터 후:

```
npm run pr:gate    → exit 0
  lint             ✓
  typecheck        ✓
  test:run         74 tests passed
  audit:components ✓ 3 components
  check:rules      ✓ synced
  test:guard       17 passed
```

**lab도 starter와 동일한 메커니즘으로 동작.** 즉 starter는 lab의 쌍둥이 — dogfooding 성립.

## 포함/제외 경계 — 왜 이 조합인가

**포함**: 규칙(`always-layer.mjs`) · 규칙 소비자(hook) · 규칙 생성기(sync-rules) · Skill 규격 · 감사기 · 통합 게이트(pre-push + CI).
→ 이 여섯이 **시스템의 구조**. 프로젝트 콘텐츠와 무관.

**제외**: ESLint config · TypeScript config · 프레임워크 선택 · 테스트 러너 · UI 라이브러리.
→ 프로젝트마다 다르고, 이 결정을 이식하면 오히려 마찰.

**경계선의 경우**: `rules/0N-*.md` 장문 체크리스트는 lab에만 두고 starter에는 없음. SKILL.md/CLAUDE.md 안에 요점은 들어있으므로 중복 문서는 생략. 필요한 팀은 원본 lab 에서 복사하면 됨.

## 한계 — 이 스타터가 보장 안 하는 것

1. **`npm run lint`·`test:run` 이 존재한다고 가정**. starter는 ESLint config / Vitest 설정을 포함 안 함. 스크립트만 있고 도구가 없으면 pr:gate가 첫 스텝에서 깨짐. README에 명시하지만 자동 설치는 아님.

2. **TypeScript 프로젝트 가정**. R1(any)·R3(dangerouslySetInnerHTML)은 TS/TSX 파일만 본다. 순수 JS 프로젝트에 이식하려면 `always-layer.mjs`의 `appliesToPath` 수정 필요.

3. **실제 새 프로젝트에서의 E2E 검증은 미수행**. `/tmp` 시뮬레이션은 Node 스크립트 레벨만 검증. 실제 Next.js + Vitest 프로젝트에 전체 pr:gate 가 green 인지는 시점·환경 의존이라 이 실험 범위 밖. 대신 lab 자체가 실 프로젝트 사례로 동작 중이라 일종의 "production reference" 역할.

4. **Claude Code 세션 가정**. `.claude/settings.json` 은 Claude Code 가 아닌 AI 도구에서는 무시됨. starter의 Hard 차단은 Claude Code 사용자에게만 작동. 다른 도구 사용자에게는 PR 게이트만 남음 — 실험 14 평가에서 지적된 한계가 그대로 전이.

5. **CLAUDE.md 템플릿의 비어있는 블록이 혼동을 줄 수 있음**. 설치 직후 `sync:rules` 를 실행하기 전엔 블록이 비어 있어 "규칙이 없다"로 오해 가능. README의 단계 순서를 지켜야 함.

## 누적 효과 (Baseline → 15)

| 영역 | Baseline | 실험 14 후 | **실험 15 후** |
|---|---|---|---|
| 자동 게이트 | 없음 | 로컬+CI 작동 | **다른 프로젝트로 이식 가능** |
| SSOT 외부화 | — | rules 한 파일 | **규칙 SSOT + config SSOT 분리** |
| 테스트 환경 독립성 | — | lab 전용 | **lab/starter 양쪽에서 17/17** |
| 이식 단계 | — | — | **cp -a + sync:rules + git config** (3 단계) |
| starter 문서 | — | — | **README + CLAUDE.md 템플릿** |

## 평가

**성공.** starter 이식 시뮬레이션 7/7 체크리스트 통과. 실험 12~14 전체가 하나의 `cp -a` 로 따라옴. SSOT(규칙) + config(값) 분리는 실측 리트머스(test-guard S7b의 맥락 변화)로 경계가 **실제로 의미 있는** 것임을 확인.

### 성공한 것
- **시스템을 구조와 값으로 분리 가능함을 증명** — regex 로직은 SSOT, 경로는 config. test-guard가 config-aware가 되어야 했던 사실이 이 분리의 필요성을 역증명.
- Lab이 starter의 dogfood — 같은 SSOT 구조를 lab이 쓰고 있으니 starter 변경의 영향을 즉시 감지 가능.
- README가 이식 순서를 명시적 절차로 고정 — `cp -a`부터 `pr:gate` 검증까지 5단계, 각 단계 실패 시 어디서 멈추는지 예측 가능.

### 남은 한계
- **실제 신규 프로젝트에서의 E2E는 미검증** (lint/test 도구 유무, 경로 레이아웃 차이 등). 시뮬레이션은 Node 레벨만.
- CI 워크플로우(`.github/workflows/pr-gate.yml`)는 lab처럼 starter에서도 **한 번도 실제 실행 안 됨** — 리모트 없는 곳에 배치.
- **Soft 층 재현성**: 실험 12에서 지적한 "다른 모델·다른 세션에서 CLAUDE.md·SKILL.md를 읽고 따르는가"는 starter 이식 시에도 똑같이 얇음. starter는 **hook·script·doc의 이식**이고, AI 행동의 이식은 포함 안 됨.

### 비용
- 구현: 약 45분 (copy + 3곳 config 외부화 + test-guard 리팩터 + 문서)
- 이식 시뮬레이션: 약 5분 (시나리오 7개)
- 이후 이식할 때마다 드는 비용: 수동 5단계 (README 명시대로).

## 시리즈 마무리 관점

실험 01~11 — **AI가 각 항목을 한 번에 잘하는가** (능력 검증, 산출물 레벨)
실험 12~14 — **매번 자동으로 트리거되는가** (시스템 내부화, 자동화 레벨)
실험 15 — **다른 프로젝트에 그대로 이식되는가** (일반화, 템플릿 레벨)

세 층이 끝남으로써 "AI Quality Baseline" 의 테제 — *기본값이 바뀌었다, 의지가 아니라 시스템으로* — 가 **문서 → 작동하는 시스템 → 이식 가능한 조각**까지 구체화. 15는 "구조와 값의 분리"가 이 시스템의 **가장 재사용 가능한 자산**임을 밝힌 실험.

## 다음 실험 후보 (시리즈 확장 시)

- **실험 16 — 실전 이식**: 별도 신규 프로젝트(예: `harness-basic` 또는 새 Next.js)에 starter 를 실제로 이식해 npm 설치·lint·test까지 green 되는 E2E 검증.
- **실험 17 — 언어/프레임워크 이식**: Python(FastAPI) 또는 Vue 쪽으로 SSOT 구조 복제 가능성 검증. 규칙은 다르지만 **구조(SSOT + config + hook + generator + audit + gate)** 가 언어 독립적인지 확인.
- **실험 18 — 규칙 수 확장 테스트**: 5개 → 20개까지 규칙이 늘어났을 때 SSOT 유지비용 곡선 관측. drift 위험과 false positive 비율 모두.
