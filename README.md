# AI Quality Lab

> AI가 "중요하지만 귀찮아서 타협했던 것들"을 진짜로 처리해주는지 검증하고,
> 그 결과를 **작동하는 자동화 시스템**으로 내재화한 실험 프로젝트.

---

## 문제의식

기존 엔지니어링에서 **품질 항목은 속도 트레이드오프**였다.
테스트 · 타입 정의 · 에러 핸들링 · 접근성 · i18n · 리뷰 — 전부 "중요한 건 아는데 지금 할 시간이 없다"로 미뤄졌다.

AI 코딩 도구가 속도 비용을 ~0 으로 만들었다.
즉 **품질 항목을 미루는 건 더 이상 시간 제약이 아니라, 시스템·의지·습관의 문제**다.

이 랩은 그 가설을 두 단계로 검증한다:

1. **능력 검증** — AI가 각 품질 항목을 실제로 한 번에 잘하나?
2. **시스템화** — 그걸 매번·자동으로·다른 프로젝트에서도 일어나게 만들 수 있나?

두 번째가 진짜 어려운 부분이다. 개별 항목이 AI로 잘 되는 건 대부분 자명하지만, 그게 **기본값이 되는** 순간은 hook·script·정책이 내려앉은 뒤에야 온다.

---

## 시리즈 전체 지도

```
 [1] 능력 검증  (실험 01~11)
     ├── AI가 품질 항목 하나를 제대로 해내는가?
     └── 한 항목 = 한 실험 = 한 결과 문서
              ↓ "할 수 있다"는 증명은 된다. 근데 자동으로 안 일어난다.
 [2] 시스템화  (실험 12~14)
     ├── 매번·자동으로 트리거되게 만들 수 있는가?
     └── 세션 내부 → 컴포넌트 생성 → PR, 세 계층 자동 게이트
              ↓ 잘 된다. 근데 이 레포에만 맞다.
 [3] 일반화    (실험 15)
     ├── 다른 프로젝트에 이식 가능한 조각인가?
     └── starter/ 번들 + SSOT/config 분리 + 이식 시뮬레이션
```

---

## 계층별 자동 방어 지도

실험 12·13·14·15·17·18 이 함께 만드는 **다층 방어**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 코드 작성 시 (항상 계층)                                  ← 실험 12      │
│   PreToolUse hook  (.claude/hooks/guard-always-layer.mjs)               │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ R1 any  /  R2 localStorage token  /  R3 dangerouslySetInnerHTML │  │
│   │ R4 console.log+secret  /  R5 NEXT_PUBLIC_*_SECRET               │  │
│   │ → Write/Edit 시점에 기계 차단 (false positive 0 검증)           │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 컴포넌트 생성 시                                          ← 실험 13      │
│   Skill: new-component          (.claude/skills/new-component/SKILL.md) │
│   Audit: audit-components       (.claude/hooks/audit-components.mjs)    │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ 한 요청 → 4종 동시 산출:                                          │  │
│   │   Name.tsx + Name.stories.tsx + __tests__/Name.test.tsx + i18n   │  │
│   │ SessionEnd 에서 누락 자동 감사 (report) / pr:gate 에서 strict    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 커밋/푸시 직전 (PR 계층)                                 ← 실험 14      │
│   pre-push hook       (.githooks/pre-push)                              │
│   GitHub Actions      (.github/workflows/pr-gate.yml)                   │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ npm run pr:gate  =  6-stage 통합 게이트                          │  │
│   │   lint → typecheck → test:run → audit:components --strict        │  │
│   │        → check:rules (SSOT drift) → test:guard (17 unit)         │  │
│   │ CI 전용 추가: CodeRabbit review (시크릿 옵트인)                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 통합/E2E 계층 (실제 앱 부팅 검증)                         ← 실험 17      │
│   Playwright     (playwright.config.ts + e2e/posts.spec.ts)            │
│   CI job         (.github/workflows/pr-gate.yml :: e2e)                 │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ 실제 Next.js dev 서버 + 실제 브라우저 + 실제 라우트/핸들러.       │  │
│   │ unit mock 이 감추는 결함(라우트 부재, cross-origin, 포커스)      │  │
│   │ 을 감지. needs: gate 직렬로 단위 피드백 속도 보존.                │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 리뷰 계층 (4 트리거 경로)                                ← 실험 18      │
│                                                                         │
│   1) PR / CI      .github/workflows/pr-gate.yml :: review               │
│                   → CodeRabbit (시크릿 + 과금, PR 한정)                 │
│   2) 로컬 심층    npm run pr:review                                     │
│                   → CodeRabbit 로컬 (과금, 현 브랜치)                   │
│   3) 로컬 무가격  npm run review:local                                  │
│                   → 변경분을 프롬프트 패키지로 stdout 덤프              │
│                   → Claude Code 서브에이전트/임의 LLM/인간에 전달       │
│   4) 세션 내 AI   서브에이전트 feature-dev:code-reviewer 호출           │
│                   → 무료, 세션 내부 자발적 트리거                       │
│                                                                         │
│   → 리뷰가 "PR 이 있어야만 돈다" 는 암묵적 전제를 깬다. 3·4번으로      │
│     PR 이전에도 코드 리뷰가 가능하고, 1·2번으로 최종 방어선 유지.       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 다른 프로젝트로 이식                                      ← 실험 15      │
│   starter/ 번들 + .claude/rules/config.mjs (프로젝트-로컬 값)           │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ cp -a starter/. new-project/                                      │  │
│   │  → config.mjs 경로 수정 → sync:rules → git config hooksPath      │  │
│   │  → pr:gate 녹색. 세 계층이 한꺼번에 활성화.                       │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SSOT 구조 — 규칙과 값의 분리

시스템 내부에서 가장 많이 복제되기 쉬운 "규칙" 을 **한 곳의 권위**로 압축:

```
                   .claude/rules/always-layer.mjs    ← SSOT (규칙 구조)
                          │
             ┌────────────┼──────────────┐
             ▼            ▼              ▼
  guard hook 실행   sync-rules.mjs   (읽기 전용 참조)
  (PreToolUse)           │
                         ▼
                    CLAUDE.md
                (BEGIN/END 마커 블록 자동 생성)

                   .claude/rules/config.mjs         ← 프로젝트-로컬 값
                          │
             ┌────────────┴──────────────┐
             ▼                           ▼
    COMPONENTS_DIR              SAFE_HTML_SINK_PATHS
   (audit-components)           (always-layer R3 면제)
```

규칙을 바꾸려면:
1. `.claude/rules/always-layer.mjs` 수정
2. `npm run sync:rules` → CLAUDE.md 재생성
3. `npm run pr:gate` → 회귀 없는지 확인

프로젝트 경로·화이트리스트만 바꾸려면:
1. `.claude/rules/config.mjs` 만 수정 (sync 불필요, 소비자가 즉시 반영)

---

## 해결한 것 — 문제 → 메커니즘 대응표

| 기존 문제 | 해결 메커니즘 | 실험 |
|---|---|---|
| 급할 때 타입 `any` 로 대충 | Write/Edit 시점에 정규식 Hard 차단 + CLAUDE.md 규칙 + tsc strict | 01·12·14 |
| 에러 핸들링·로딩/에러 UI 누락 | 테스트·axios 인터셉터·TanStack Query 패턴 + CLAUDE.md Soft 가이드 | 02·12·14 |
| 토큰 localStorage 저장·XSS sink 남발 | Hard 차단(R2/R3/R4/R5) + SafeHtml 봉인 + sanitize 테스트 | 03·05·12 |
| 테스트가 있어야 하는 걸 아는데 안 씀 | Vitest + happy-dom 기반 71→74 단위 테스트 + Skill 규격으로 컴포넌트마다 강제 | 04·13 |
| 새 컴포넌트마다 aria/story/i18n 빠뜨림 | new-component Skill 4종 동시 산출 + SessionEnd audit + pr:gate strict | 07·08·10·13 |
| 트래킹/로깅 심는 게 귀찮아 | EventMap 타입 + 15곳 일괄 instrumentation (PII 보호 포함) | 09·11 |
| "코드 리뷰 받을 사람이 없다" | CodeRabbit 자동 실행 — CI 전용 PR 게이트 | 11·14 |
| 규칙이 여러 파일에 복제되어 drift | SSOT(.mjs) + generator(sync-rules) + check 모드 pr:gate | (리팩터) |
| 시스템을 다른 프로젝트에 복제 불가 | starter/ 번들 + config 외부화 + 이식 시뮬레이션 | 15 |

---

## 정량 요약

| 지표 | 값 |
|---|---|
| 단위 테스트 | **74** (baseline 0) |
| Storybook 스토리 | **14** (3 컴포넌트) |
| i18n 키 (ko/en 평행) | **43** |
| 분석 이벤트 (PII 안전) | **16** |
| Hard 차단 규칙 | **5** (코드베이스 false positive 0건 검증) |
| 자동 게이트 트리거 | **3** (on-demand / pre-push / CI) |
| 실험 결과 문서 | **15** (`results/01~15.md`) |
| `pr:gate` 실행 시간 | **~5초** |

---

## 저장소 구조

```
ai-quality-lab/
├── app/                     # Next.js 페이지 (실험을 거치며 개선됨)
├── components/              # 재사용 컴포넌트 (SafeHtml, CommentList, Alert)
├── lib/                     # 도메인 유틸 (api, auth, http, sanitize, schemas, i18n, analytics)
├── rules/                   # 원본 규칙 체크리스트 (인간 참조용 장문 문서)
├── results/                 # 실험 01~18 결과 기록 (정량·정성)
├── e2e/                     # ← 실험 17: Playwright E2E 스펙
├── playwright.config.ts     # ← 실험 17: webServer + chromium
├── starter/                 # ← 실험 15: 다른 프로젝트로 이식 가능한 번들
├── .claude/
│   ├── settings.json        # PreToolUse + SessionEnd hook 등록
│   ├── hooks/               # guard-always-layer / audit-components / test-guard
│   ├── rules/               # ← SSOT: always-layer.mjs + 프로젝트 config.mjs
│   ├── scripts/             # sync-rules.mjs + review-local.mjs (실험 18)
│   └── skills/              # new-component (컴포넌트 스캐폴드 Skill)
├── .githooks/pre-push       # 로컬 push 직전 pr:gate
├── .github/workflows/       # CI 게이트 + CR 리뷰
├── CLAUDE.md                # AI 지시서: 항상 계층 생성 블록 + 추가 가이드
├── AI_QUALITY_BASELINE.md   # 최초 문제의식 + 항목 카탈로그
└── AGENTS.md
```

---

## 주요 명령어

```bash
npm run dev               # 개발 서버
npm run test:run          # 74개 단위 테스트
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run audit:components  # 컴포넌트 discipline 감사 (--strict 포함)
npm run sync:rules        # SSOT → CLAUDE.md 재생성
npm run check:rules       # drift 검사 (pr:gate 용)
npm run test:guard        # guard hook 단위 테스트 17 케이스
npm run pr:gate           # 위 6개 순차 실행 (pre-push / CI 공통)
npm run e2e               # ← 실험 17: Playwright E2E (dev server 자동 기동)
npm run review:local      # ← 실험 18: 변경분을 리뷰 프롬프트 패키지로 stdout 덤프
npm run pr:review         # CodeRabbit 로컬 (과금, 현 브랜치)
```

실험 재현: 각 `rules/0N-*.md` 를 컨텍스트로 AI에게 제시 → 적용 요청 → `results/0N-*.md` 체크리스트와 대조.

---

## 이 실험이 말하는 것

> **품질은 이제 시간의 문제가 아니라 시스템의 문제다.**

AI는 품질 항목의 속도 비용을 0으로 만들었다. 그래서 남은 건 두 가지뿐:

1. **규칙을 코드로 내려앉힐 수 있는가** — 실험 12~14 가 "있다" 에 수렴
2. **그 코드가 이식 가능한 조각인가** — 실험 15 가 "그렇다" 에 수렴

가장 큰 자산은 테스트 74개도 Hard 규칙 5개도 아니다.
"**어디까지 Hard 로 강제하고, 어디부터 Soft 로 유도할지**"의 경계 문서 — 즉 `results/12~15.md` — 가 이 프로젝트의 진짜 산출물이다.

### 아직 열려 있는 한계

- **Soft 층 재현성**: CLAUDE.md·SKILL.md 를 다른 모델·다른 세션에서도 일관되게 따르는지는 미측정.
- **Hook의 작동 범위**: Claude Code 세션에서만 유효. 다른 AI 도구에선 PR 계층만 남음.
- **실전 이식 E2E**: starter 이식은 시뮬레이션만. 실제 신규 프로젝트 npm 환경에서의 녹색 여부는 시점 의존.
- **규칙 수 확장**: 5개에서는 관리 가능. 20개·50개로 갈 때의 유지비 곡선은 미측정.

이 한계들은 시리즈의 **자연스러운 다음 실험** — 재현성 스모크, 크로스-프레임워크 이식, 실전 E2E — 으로 이어진다.
