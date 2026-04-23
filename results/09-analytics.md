# 실험 09: Analytics / Monitoring 결과

## 측정 일시
2026-04-23

## 베이스라인 (실험 08 직후)

| 항목 | 수치 |
|---|---|
| 사용자 액션 추적 | 0건 |
| 이벤트 카탈로그 | 없음 |
| 어댑터 추상화 | 없음 |
| 단위 테스트 | 64개 |

## 적용 후

| 항목 | 수치 |
|---|---|
| `track()` 호출 (앱/컴포넌트) | **15곳** |
| 이벤트 종류 | **15개** (4 도메인) |
| 어댑터 인터페이스 | **단일 시그니처** (`Adapter`) |
| 어댑터 swap 가능 (런타임) | ✅ `setAdapter()` |
| 컴파일 보호 | `EventName` literal union + `EventMap` shape |
| 단위 테스트 | **69개** (+4 analytics, +1 CommentList lifecycle) |
| TypeScript strict 에러 | 0 |
| ESLint 에러 | 0 |

## 변경 내용

### 신규
- `lib/analytics/events.ts` — `EventMap` 인터페이스 (이벤트 → properties shape)
- `lib/analytics/index.ts` — `track()`, `setAdapter()`, `consoleAdapter`, 기본 noop
- `lib/__tests__/analytics.test.ts` — 4 cases

### 일괄 instrumentation (한 번에 15곳)

**`app/login/page.tsx`** (3개)
- 폼 제출: `auth.login.attempt`
- mutation onSuccess: `auth.login.success`
- mutation onError: `auth.login.failure`

**`app/posts/page.tsx`** (3개)
- mount: `post.list.view`
- 삭제 클릭: `post.delete.attempt`
- onSuccess/onError: `post.delete.success/failure`

**`app/posts/new/page.tsx`** (3개)
- 폼 제출: `post.create.attempt`
- onSuccess/onError: `post.create.success/failure`

**`app/posts/[id]/page.tsx`** (1개)
- mount: `post.detail.view`

**`components/CommentList.tsx`** (3개)
- mount: `comment.list.view`
- 폼 제출: `comment.create.attempt`
- onSuccess/onError: `comment.create.success/failure`

(추적 누락된 페이지·액션 0건 — `useMutation` 모두 `onSuccess + onError`에서, 각 페이지 mount는 `useEffect`에서)

### 이벤트 카탈로그 구조

```ts
export interface EventMap {
  'auth.login.attempt':   { email: string }
  'auth.login.success':   { userId: number }
  'auth.login.failure':   { reason: string }
  'post.list.view':       Record<string, never>
  'post.detail.view':     { postId: number }
  'post.create.attempt':  Record<string, never>
  'post.create.success':  { postId: number }
  'post.create.failure':  { reason: string }
  'post.delete.attempt':  { postId: number }
  'post.delete.success':  { postId: number }
  'post.delete.failure':  { postId: number; reason: string }
  'comment.list.view':    { postId: number }
  'comment.create.attempt': { postId: number }
  'comment.create.success': { postId: number; commentId: number }
  'comment.create.failure': { postId: number; reason: string }
}
```

→ `track('post.delete.success', { reason: '...' })` 같은 잘못된 properties는 **컴파일 에러**.

## 규칙 체크리스트 결과

### 이벤트 카탈로그
- [x] `EventName` literal union으로 컴파일 보호
- [x] 이벤트별 properties shape 강제
- [x] 도메인 네임스페이스 (`auth.*`, `post.*`, `comment.*`)

### 적용 대상 (모든 사용자 액션)
- [x] 폼 제출 attempt + success + failure 분리
- [x] 페이지 진입 view 이벤트 (3곳)
- [x] 파괴적 액션(delete) attempt + success + failure

### 어댑터
- [x] 기본 noop (테스트/SSR 안전)
- [x] `setAdapter()`로 런타임 교체
- [x] 동일 시그니처 — `consoleAdapter` 예시 제공, Sentry/PostHog는 같은 `Adapter` 타입 구현
- [x] 어댑터 throw 시 swallow (사용자 흐름 보호)

### 회귀 방지
- [x] 모든 `useMutation`이 onSuccess + onError에서 track (5개 mutation 전부)
- [x] 모든 페이지·컴포넌트 mount가 view 이벤트 (3곳 — list/detail/comments)
- [x] 어댑터 호출 단위 테스트 4개 + 컴포넌트 라이프사이클 테스트 1개

## 평가

**성공.** 5개 페이지·컴포넌트, 5개 mutation, 3개 view에 **타입 안전한 트래킹 한 번에 propagate**. 호출부는 단일 함수(`track`)만 사용, 실제 백엔드는 어댑터 한 줄로 교체.

### 어댑터 swap 예시 (production 마이그레이션 경로)

```ts
// app/layout.tsx 또는 별도 init 모듈에서
import { setAdapter } from '@/lib/analytics'
import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

setAdapter((event, props) => {
  Sentry.addBreadcrumb({ category: 'track', message: event, data: props })
  posthog.capture(event, props)
})
```

호출부 코드 변경 0줄.

### 주목할 점

- **타입 안전성** — `track('post.delete.success', { postId: 1 })`만 가능. `success`에 `reason`이 와도, `failure`에 `reason`이 빠져도 모두 컴파일 에러
- **장애 격리** — 트래킹 어댑터가 실패해도 `try/catch`로 swallow → Sentry가 죽어도 게시글 삭제는 진행됨. 단위 테스트로 명문화
- **테스트 친화** — `setAdapter(spy)`로 호출 검증. 컴포넌트 통합 테스트(`CommentList.test.tsx`)에서 mount → submit 라이프사이클 트래킹 검증
- **05·06과의 일관성** — 새 페이지를 만들 때마다 04의 테스트 패턴 + 06의 컴포넌트 패턴 + 09의 트래킹 패턴이 모두 한 번에 따라옴
- **다음 단계** — `useMutation` 자체를 `useTrackedMutation(eventPrefix, ...)`로 wrap하면 onSuccess/onError 중복도 사라짐. 06 실험과 같은 "패턴을 hook으로" 진화 가능

## 누적 효과 (Baseline → 09)

| 영역 | Baseline | Now |
|---|---|---|
| 단위 테스트 | 0 | **69** |
| 페이지·컴포넌트 | 3 | **5** |
| 사용자 액션 추적 | 0 | **15** |
| 메시지 카탈로그 키 | 0 | **42** (i18n) |
| 보안 위험 (token, XSS, dangerous HTML) | 3 | **0** |
| 폼 보일러플레이트 (useState+onChange) | 4쌍 | **0** |
| 검증 책임 분산 | 3곳 | **1곳** (zod schemas) |
| `dangerouslySetInnerHTML` 호출부 | 1 | **0** (SafeHtml 봉인) |
| a11y 폼 입력 연결 | 0/5 | **5/5** |

## 누적 의미

02 → 09 흐름이 보여준 것은: **AI에게 "이번엔 X 규칙 적용해줘"를 줄 때, 이전 실험에서 만든 코드 모양·테스트·문서가 강력한 컨텍스트로 작용**한다는 점.

- 02에서 axios 인터셉터 자리를 만들어두었기에 → 03이 `withCredentials: true` 한 줄로 끝남
- 03에서 zod 스키마 SSOT를 만들어두었기에 → 08이 메시지 키 추출 대상을 깔끔히 식별
- 04에서 테스트를 깔아두었기에 → 05~09 리팩터·확장이 안전망 위에서 진행
- 06에서 패턴을 propagate 가능한 형태로 정착시켰기에 → 07~09가 새 페이지 추가 없이 일괄 적용

규칙은 한 번 정의하면 되지만, **규칙들이 서로의 적용 비용을 줄여준다**는 게 누적 효과의 핵심.

## 다음 실험 후보

- 10. `useTrackedMutation` 훅으로 트래킹 보일러플레이트 한 단계 더 흡수
- 10. CI 워크플로우 — GitHub Actions로 lint + tsc + test 자동화
- 10. ESLint custom rule — `dangerouslySetInnerHTML` 호출부 사용 빌드 차단
