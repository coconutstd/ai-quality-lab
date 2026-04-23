@AGENTS.md

# AI Quality Lab

AI가 "중요하지만 귀찮아서 타협했던 것들"을 실제로 잘 처리해주는지 검증하는 실험 프로젝트.

## 실험 구조

```
rules/         ← 규칙 명세 (실험별 컨텍스트로 사용)
├── 01-type-safety.md
├── 02-error-handling.md
├── 03-security.md
├── 04-tests.md
└── 05-refactoring.md

app/           ← Next.js 페이지 (실험을 거치며 개선됨)
├── login/page.tsx       ← RHF + zodResolver
├── posts/page.tsx       ← TanStack Query
└── posts/[id]/page.tsx  ← <SafeHtml> 사용

components/    ← 재사용 컴포넌트 (실험 05에서 도입)
└── SafeHtml.tsx         ← dangerouslySetInnerHTML 봉인

lib/           ← 도메인 유틸 (실험을 거치며 개선됨)
├── api.ts               ← axios + zod parse
├── auth.ts              ← httpOnly 쿠키 전제
├── http.ts              ← axios 인스턴스 + toFriendlyError 인터셉터
├── sanitize.ts          ← DOMPurify 화이트리스트
├── schemas.ts           ← zod 스키마 (타입 SSOT)
├── types.ts             ← schemas로부터 타입 re-export
└── query-provider.tsx   ← TanStack Query Provider

lib/__tests__/           ← 단위 테스트 (실험 04~)
components/__tests__/

results/       ← 항목별 실험 결과 기록
```

## 실험 흐름

1. `rules/0N-*.md` 파일을 컨텍스트로 제공
2. "이 규칙을 적용해줘"로 AI에게 요청
3. 결과 코드가 체크리스트를 충족하는지 검증
4. `results/0N-*.md`에 결과 기록

## 검증 명령어

```bash
# any 잔존 개수
grep -rn ": any" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l

# TypeScript strict 체크
npx tsc --noEmit --strict

# 보안 패턴 스캔 (호출부에서 dangerouslySetInnerHTML 0건이어야 함)
grep -rn "localStorage.setItem\|dangerouslySetInnerHTML\|console.log.*token" app/ lib/ --include="*.ts" --include="*.tsx"

# 단위 테스트
npm run test:run
```

<!-- rules:always-layer:begin -->
<!-- 이 블록은 `.claude/rules/always-layer.mjs` 에서 생성됩니다. 직접 수정하지 마세요. -->
<!-- 규칙을 바꾸려면 SSOT 파일을 고친 뒤 `npm run sync:rules` 실행. -->

## 항상 계층 (코드 작성 시 자동 적용)

아래 규칙은 **요청에 명시되지 않아도** 모든 코드 생성/수정에서 기본값이다.
`.claude/hooks/guard-always-layer.mjs` 가 Write/Edit 시점에 정적 패턴을 **기계 차단** 한다.

| ID | 규칙 | 출처 |
|---|---|---|
| R1 | `any` 사용 금지. 모르는 입력은 `unknown` + 타입 가드. `as` 강제 캐스팅 지양. | `rules/01-type-safety.md` |
| R2 | `localStorage`에 토큰/JWT 저장 금지 → httpOnly 쿠키. | `rules/03-security.md` |
| R3 | `dangerouslySetInnerHTML` 호출부 직접 사용 금지 → `<SafeHtml />`. | `rules/03-security.md` |
| R4 | `console.log`로 토큰/비밀번호/시크릿 출력 금지. | `rules/03-security.md` |
| R5 | `NEXT_PUBLIC_*_SECRET|PRIVATE|PASSWORD` 금지 (번들 유출). | `rules/03-security.md` |

### 규칙 위반 대응
hook이 위반을 발견해 편집을 차단하면, 차단 사유에 적힌 대안(예: `<SafeHtml />`, `unknown` + 타입 가드)으로 재작성 후 다시 시도한다. hook을 우회하는 수정은 하지 않는다 — 맥락상 예외가 필요하면 사용자에게 사유를 먼저 설명.

<!-- rules:always-layer:end -->

## 추가 가이드 (Hard로 차단 불가, Soft 유도)

에러 핸들링 · 입력 검증은 정적 패턴으로 잡기 어려워 hook에는 없다. 아래는 AI가 코드 작성 시 자발적으로 지켜야 할 기본값.

### 에러 (rules/02)
- 모든 `async/await`에 `try-catch` 또는 `.catch()`. fetch는 `response.ok` 체크.
- 로딩/에러 상태 UI 필수. 에러는 콘솔이 아니라 사용자에게 전달.
- 폼 제출 중 중복 클릭 방지 (버튼 비활성화).

### 입력 검증 (rules/03)
- 사용자 입력은 서버로 보내기 전 기본 검증 (이메일/길이 등).
- 클라이언트 검증과 서버 검증은 동일한 zod schema 재사용.

---

## 실험 순서

- [x] 01. Type Safety
- [x] 02. Error Handling (+ axios + TanStack Query)
- [x] 03. Security (+ zod + react-hook-form)
- [x] 04. Tests (Vitest + happy-dom)
- [x] 05. Refactoring (안전망 위에서 SafeHtml 봉인 + toFriendlyError 추출)
- [x] 06. Boilerplate Elimination (패턴 propagate — /posts/new + CommentList)
- [x] 07. Accessibility (label·aria-describedby·role=alert·aria-busy)
- [x] 08. i18n (키 카탈로그 + ko/en + 컴파일 보호)
- [x] 09. Analytics (15곳 일괄 instrumentation + 어댑터 swap)
- [x] 10. Storybook (3개 컴포넌트 11개 케이스 + cache priming + 어댑터 주입)
- [x] 11. AI Pre-Review (CodeRabbit) — 40개 finding 분류 → 진짜 가치 3개 적용 + 회귀 테스트
- [x] 12. 항상 계층 자동 차단 — CLAUDE.md 규칙 + PreToolUse hook (9/9 시나리오 실측 통과)
- [x] 13. 컴포넌트 계층 자동 적용 — new-component skill + SessionEnd audit (Alert 수용 시험 통과)
- [x] 14. PR 계층 통합 게이트 — pr:gate 스크립트 + pre-push hook + GitHub Actions (green/red 실측 통과)
- [x] 15. 프로젝트 초기 계층 — starter/ 번들 + SSOT/config 분리 + 이식 시뮬레이션 7/7 통과
- [x] 16. 하네스 실작동 관측 — ConfirmDialog + post 편집/삭제 확인 기능 개발 중 5계층 관측 (83 tests, pr:gate 6/6, G1~G6 개선 후보 도출, G2는 SKILL.md에 즉시 반영)
- [x] 17. 통합/E2E 계층 — /posts 404 실사례 기반. 인메모리 mock API(app/api/*) + Playwright 5 플로우 + CI e2e job 분리. 단위가 감추던 결함 2종 실제 포착(underscore route 배제, cross-origin dev). 로컬 subagent 코드 리뷰로 Critical 1 + High 1 + Medium 2 추가 차단
