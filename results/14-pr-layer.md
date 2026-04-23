# 실험 14: PR 계층 통합 게이트 결과

## 측정 일시
2026-04-23

## 목표

"PR 올리기 전" 계층(코드 리뷰·테스트·로깅/감사)을 **단일 커맨드로 통합**하고, 로컬 pre-push + CI 양쪽에서 **자동 트리거**되도록 한다.
실험 12·13은 **세션 내부** 방어(Hard hook, Skill, SessionEnd audit)였다면, 14는 **세션 경계를 넘어** 커밋·푸시·PR 시점의 방어다.

## 설계 — 3-Tier 자동화

| 트리거 | 실행 위치 | 포함 게이트 | 실패 시 동작 |
|---|---|---|---|
| 개발자 on-demand | `npm run pr:gate` | lint + typecheck + test:run + audit-components --strict | exit 1 |
| `git push` 직전 | `.githooks/pre-push` | `pr:gate` | push 중단 |
| `pull_request` on GitHub | `.github/workflows/pr-gate.yml` | `pr:gate` + CodeRabbit review | CI 실패 / 리뷰 코멘트 |

각 티어가 **동일한 `pr:gate` 스크립트**를 공유 — 환경 간 drift 방지. CR만 CI 전용 (시간·비용 때문).

## 통합 스크립트 — `package.json`

```json
"typecheck":        "tsc --noEmit",
"audit:components": "node .claude/hooks/audit-components.mjs --strict",
"pr:gate":          "npm run lint && npm run typecheck && npm run test:run && npm run audit:components",
"pr:review":        "coderabbit review --agent -t all"
```

### 왜 이 순서인가
1. **lint** 먼저 (가장 빠름, 대부분 잡힘)
2. **typecheck** (수 초)
3. **test:run** (수 초~수십 초; 의미 있는 실패가 여기서 많이 걸림)
4. **audit:components** (즉시; 실험 13의 discipline 게이트)
5. (CI 전용) **CR review** — 위 4개가 녹색일 때만 의미 있음. 실험 11 결과대로 **signal-to-noise가 40:3**이라 사전 필터링이 없으면 잡음이 큼.

## 구성 요소

### 1. `.githooks/pre-push` (로컬)

```bash
#!/usr/bin/env bash
set -e
echo "→ PR 게이트: lint + typecheck + test + audit-components"
npm run pr:gate
echo "✓ PR 게이트 통과"
```

**활성화** (저장소 clone 직후 1회):
```bash
git config core.hooksPath .githooks
```

**긴급 우회** (예외 승인된 경우만): `git push --no-verify` — 하지만 이때 CI가 같은 게이트를 돌리므로 단순 우회는 PR 수준에서 다시 걸린다.

### 2. `.github/workflows/pr-gate.yml` (원격)

두 job:
- `gate` — push/PR 공통. `npm ci && npm run pr:gate`.
- `review` — PR 이벤트에서만. `gate` 통과 후에만 CR 실행. `CODERABBIT_API_KEY` 미설정 시 스킵(옵트인).

```yaml
jobs:
  gate:
    runs-on: ubuntu-latest
    steps: [checkout, setup-node@20, npm ci, npm run pr:gate]
  review:
    if: github.event_name == 'pull_request'
    needs: gate
    steps: […, npx coderabbit review --agent -t all]
```

## 실측

### Green path — 현재 상태

```
$ npm run pr:gate
lint         ✓
typecheck    ✓
test:run     74 tests passed (10 files)
audit        ✓ 3개 컴포넌트 모두 동반 산출물 보유
exit 0
```

### Red path — 각 게이트가 실패를 정확히 잡는지

| 주입한 결함 | 실패해야 할 게이트 | 결과 |
|---|---|---|
| `components/_RedTest.tsx` 만 생성 (story/test 누락) | audit:components | ✅ `audit` 단계에서 누락 2건 리포트, exit 1. 전체 `pr:gate` exit 1. |
| `lib/_red-type.ts`에 `const wrong: number = "string"` | typecheck | ✅ `TS2322: Type 'string' is not assignable to type 'number'`, exit 2. |
| (기존 테스트 정상) | — | — |
| (기존 lint 정상) | — | — |

파일 정리 후 재실행 — **exit 0으로 즉시 복귀**. 게이트는 repo 상태에 1:1 대응, side-effect/state 남김 없음.

### 세션 내부 방어와의 상호작용

실험 12 hook(PreToolUse)이 `any` 삽입을 Write 시점에 차단하기 때문에, **typecheck의 "any 남용" 실패는 PR 게이트에 도달하기 전에 대부분 걸러진다**. PR 게이트는 그 틈새(암묵적 any, 복잡한 타입 추론 실수)를 방어하는 2차 그물.

실험 13 audit은 원래 SessionEnd에만 등록되어 "세션 끝에 경고" 수준이었는데, PR 게이트에서 `--strict`로 승격되어 **실질 블로커**가 됨. 같은 스크립트가 역할을 달리해 두 계층에서 재사용됨.

## 세 계층 방어 지도

```
코드 작성 (항상) ────→  PreToolUse hook (실험 12)         : any/localStorage token/XSS 등 Hard 차단
                                │ pass
                                ▼
컴포넌트 생성 ────────→  Skill 계약 + SessionEnd audit (13): 4종 동반 산출 유도 + 회고적 감사
                                │ pass
                                ▼
커밋/푸시 직전 ───────→  pre-push → pr:gate (14)          : lint + typecheck + test + audit(strict)
                                │ pass
                                ▼
PR 올림 ──────────────→  GitHub Actions gate + CR review   : 동일 게이트 + AI 사전 리뷰
                                │ pass
                                ▼
사람 리뷰 / 머지
```

### 각 계층이 잡는 결함의 성격

| 계층 | 잡는 것 | 놓치는 것 (다음 계층으로 위임) |
|---|---|---|
| **12 PreToolUse** | 정적 패턴(any, XSS sink, 토큰 유출) — 단일 파일 상태 | 멀티 파일 일관성, 맥락 의존 에러(try-catch 누락) |
| **13 Skill+Audit** | 컴포넌트 동반 산출물(story·test·i18n) | 내용 품질, 타입 추론 에러 |
| **14 PR gate** | 전체 타입 일관성, 테스트 실패, 린트 회귀, 컴포넌트 discipline | 디자인 리뷰, 의도 검증 |
| **14 CR (CI 전용)** | 사람이 놓친 보안·PII 앵글(실험 11 결과) | 아키텍처 판단, 도메인 지식 |

실험 12·13이 없었다면 **14가 모든 결함을 떠안아야 해서 사이클 타임이 길어짐**. 앞 계층의 가치는 "PR 게이트에 오기 전에 대부분 잡힌다"로 정량화됨.

## 누적 효과 (Baseline → 14)

| 영역 | Baseline | 실험 13 후 | **실험 14 후** |
|---|---|---|---|
| 단위 테스트 | 0 | 74 | 74 |
| 자동 게이트 (로컬) | 없음 | SessionEnd audit (경고) | **pre-push → pr:gate (블로킹)** |
| 자동 게이트 (CI) | 없음 | 없음 | **pr-gate.yml + CR review** |
| 게이트 통합 커맨드 | — | — | **`npm run pr:gate`** (재현 가능) |
| 세션 경계 방어 | 없음 | 없음 | **있음** (push 이후도 CI가 동일 검사) |

## 평가

**성공.** Green/Red 모두 의도대로 작동. pre-push 훅·CI 워크플로우·on-demand 스크립트가 **단일 `pr:gate` 정의**를 공유하므로 drift가 없고, 실험 12·13의 산출물이 상위 계층에 깔끔하게 승계됨.

### 성공한 것
- 동일 게이트가 **3개 트리거**(on-demand, pre-push, CI)에서 재사용됨 — 구성 drift 0
- `audit-components` 스크립트가 실험 13의 SessionEnd-warn에서 PR-block으로 **역할 승격**만으로 재활용됨 — 작은 조각을 여러 계층에서 쓰는 패턴 실증
- Red path 2건 모두 정확한 exit code + 구체적 실패 메시지 — 우회 유인 최소
- CR을 `needs: gate`로 CI에서만 실행 → 잡음 감소 + 비용 절감(실험 11의 "사전 필터링" 교훈 반영)

### 남은 한계
- `.githooks` 활성화는 사용자가 **clone 직후 `git config` 1회**를 해야 함 — husky는 자동화해주지만 dependency 추가. 이 실험은 zero-dep 우선이라 수동 단계를 용인.
- 리모트가 없는 로컬 lab이라 CI 워크플로우는 **미실행 상태로 배치**. GitHub에 올리면 즉시 작동하도록 설계됨(검증은 배치 상태).
- CR은 `CODERABBIT_API_KEY` 시크릿이 있어야 실행됨 — 키 없는 fork PR에선 자동 스킵.
- pre-push가 수십 초 걸릴 수 있음 (test:run). 빠른 개발 루프에선 **pre-commit에서 lint만**, **pre-push에서 풀 게이트**로 분할도 가능(이 실험은 한 단계로 통일).

### 비용
- 구현: 약 20분 (스크립트 3개 + hook + workflow + 실측)
- 실행 시간 (현재 코드베이스): green path 약 5초, red path는 해당 게이트에서 즉시 단락

## 다음 실험 후보

- **실험 15 — 프로젝트 초기 계층**: 지금의 `ai-quality-lab/` 전체(.claude/, .githooks/, .github/, rules/, CLAUDE.md)를 **스타터 템플릿**으로 압축. 새 프로젝트에 `cp -r` 한 번으로 12~14 전부 따라오는지 검증.
- **14 확장 — pre-commit 분할**: lint는 pre-commit (10분의 1초), 나머지는 pre-push로. 빠른 루프 최적화.
- **14 확장 — 게이트별 실행 시간 측정 대시보드**: CI 시간이 길어지면 어느 스텝이 병목인지 자동 리포트.
