# 실험 03: Security 결과

## 측정 일시
2026-04-23

## 베이스라인 (적용 전)

| 항목 | 수치 |
|---|---|
| `localStorage.setItem('token', ...)` | 1곳 (`lib/auth.ts`) |
| `dangerouslySetInnerHTML` (raw 주입) | 1곳 (`app/posts/[id]/page.tsx`) |
| `console.log` 토큰 출력 | 1곳 (`lib/auth.ts`) |
| 입력 검증 | 0곳 |
| `withCredentials` 설정 | 없음 |

## 적용 후

| 항목 | 수치 |
|---|---|
| `localStorage.setItem` | **0곳** |
| 토큰을 클라이언트 JS에서 접근 | **불가** (httpOnly 쿠키 전제) |
| `dangerouslySetInnerHTML` (raw) | **0곳** |
| `dangerouslySetInnerHTML` (DOMPurify sanitized) | 1곳 (escape hatch) |
| `console.log` 민감 정보 | **0곳** |
| 입력 검증 함수 호출 | **1곳** (로그인 폼) |
| `withCredentials: true` | **1곳** (axios 인스턴스) |
| TypeScript strict 에러 | **0** |
| ESLint 에러 | **0** |

## 변경 내용

### `lib/http.ts`
- `withCredentials: true` 추가 → 브라우저가 httpOnly 쿠키를 자동 동봉
- 클라이언트는 토큰을 만질 일이 없음 (인증 헤더 수동 주입 제거)

### `lib/auth.ts` (전면 재작성)
- `localStorage.setItem('token', ...)` 제거
- `console.log('로그인 성공, token:', ...)` 제거
- `getToken` / `getAuthHeader` 제거 (httpOnly 쿠키는 JS에서 읽을 수 없으므로 의미 없음)
- `LoginResponse` → `LoginResult` (token 필드 제거, user 정보만 반환)
- `logout()`도 서버 호출(`POST /auth/logout`)로 변경 — 쿠키 만료는 서버 책임

### `lib/types.ts`
- `LoginResponse.token` 제거 → 타입 시스템에서도 토큰 노출 차단

### `lib/validators.ts` (신규)
- `validateLogin(email, password)` — 이메일 정규식 + 비밀번호 길이 검사
- 검증 로직을 페이지 컴포넌트에서 분리 → 재사용·테스트 가능

### `lib/sanitize.ts` (신규)
- `sanitizeHtml(dirty)` — `isomorphic-dompurify`로 화이트리스트 sanitize
- 허용 태그: `p, br, strong, em, u, a, ul, ol, li, blockquote, code, pre, h1~h3`
- 허용 속성: `href, title, target, rel`
- 스크립트, 이벤트 핸들러(`onclick=`), `<iframe>` 등 자동 제거

### `app/login/page.tsx`
- `validateLogin` 호출 → `validationError` state로 표시
- `type="email"` / `type="password"` / `required` / `minLength={8}` — 브라우저 네이티브 검증도 함께 활용
- `autoComplete` 속성 추가 (UX + 비밀번호 매니저 호환)

### `app/posts/[id]/page.tsx`
- `useMemo`로 sanitize 결과 캐싱
- 주입 전 항상 `sanitizeHtml`을 통과 → XSS 차단

## 규칙 체크리스트 결과

### 인증 토큰
- [x] `localStorage`에 JWT 저장 금지 → `httpOnly` 쿠키 사용
  - 클라이언트 코드에서 토큰 식별자 자체가 사라짐 (`LoginResult`에 `token` 필드 없음)
- [x] 토큰을 클라이언트 JS 코드에 하드코딩 금지
- [x] 민감한 정보를 URL 파라미터로 전달 금지
  - 모든 인증 요청은 `POST` body 사용

### XSS 방지
- [x] `dangerouslySetInnerHTML` 사용 금지 (불가피한 경우 DOMPurify로 sanitize)
  - 1회 잔존, 단 `sanitizeHtml`을 거친 결과만 주입 (escape hatch 패턴)
- [x] 사용자 입력을 그대로 렌더링 금지
- [x] 외부 데이터 표시 시 React의 자동 escape 의존
  - `{post.title}`, `{post.author}` 등 평문은 React가 자동 escape

### 입력 검증
- [x] 폼 입력값 클라이언트 사이드 검증 필수
- [x] 서버로 보내기 전 이메일 형식, 비밀번호 길이 등 기본 검증
  - `validateLogin`이 mutate 직전 실행
- [-] SQL Injection 방어 (서버 측 항목 — 본 실험 범위 밖)

### API 요청
- [x] 민감한 API 키를 클라이언트 번들에 포함 금지
  - `NEXT_PUBLIC_` 사용처 0곳
- [-] `.env.local` 관리 (현재 사용 환경변수 없음)

### 기타
- [x] `console.log`로 민감한 데이터 출력 금지
- [-] HTTPS 강제 (배포 환경 항목)

## 평가

**성공.** 클라이언트에서 다룰 수 있는 보안 항목을 모두 충족.

### 주목할 점

- **타입 시스템이 보안을 강화** — `LoginResponse.token` 필드를 제거하니 "토큰 만질 일"이 컴파일 단계에서 차단됨. 코드 리뷰 누락 위험 감소.
- **escape hatch 패턴** — `dangerouslySetInnerHTML` 자체를 금지하는 대신 `sanitizeHtml`을 통과한 값만 주입 가능하도록 만듦. 향후 lint rule로 `dangerouslySetInnerHTML` 직접 사용을 금지하고 `sanitizeHtml` 경유만 허용하도록 강제 가능.
- **02 실험과의 시너지** — `lib/http.ts` 인터셉터가 이미 있었기에 `withCredentials: true` 한 줄로 인증 정책 전환 완료. 호출부 코드는 변경 없음.
- **검증 로직 분리** — `lib/validators.ts`에 검증을 빼두면 서버 측에서도 같은 정규식을 공유할 수 있고(추후 zod schema로 통합 가능), 단위 테스트 작성이 쉬워짐.
- **백엔드 책임으로 명시** — `lib/auth.ts` 주석에 "토큰은 서버가 httpOnly 쿠키로 내려준다"고 못박음. 클라이언트와 서버의 보안 책임 경계가 코드에 드러남.

### 남은 위험 (본 실험 범위 밖)

- CSRF 토큰 — httpOnly 쿠키 사용 시 추가 방어 필요. 다음 실험 후보.
- CSP 헤더 — `next.config.ts` 또는 미들웨어 레벨에서 설정.
- 의존성 취약점 — `npm audit` 정기 실행.

## 검증 커맨드 결과

```bash
$ grep -rn "localStorage.setItem" app/ lib/
(없음)

$ grep -rn "dangerouslySetInnerHTML" app/
app/posts/[id]/page.tsx:32:      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
# safeHtml = sanitizeHtml(post.content) — DOMPurify 통과

$ grep -rn "NEXT_PUBLIC_" app/ lib/
(없음)

$ grep -rn "console.log.*token\|console.log.*password" app/ lib/
(없음)

$ npx tsc --noEmit --strict
(에러 없음)

$ npm run lint
(에러 없음)
```

## 다음 실험 후보

- 04. CSRF 방어 (httpOnly 쿠키 보완)
- 04. 접근성 (a11y) — 폼 라벨, ARIA, 포커스 관리

---

## 후속: zod 통합 비교

### 측정 일시
2026-04-23

### 목적
검증 책임이 흩어진 세 곳을 zod 스키마 한 곳으로 합쳤을 때, 동일한 보안 규칙을 만족하면서도 **타입–런타임 검증–입력 검증의 동기화 책임**이 사라지는지 확인.

### 적용 전 책임 분포

| 책임 | 위치 | 도구 |
|---|---|---|
| 타입 선언 | `lib/types.ts` | `interface` |
| 응답 런타임 가드 | `lib/api.ts`, `lib/auth.ts` | 수작업 `function isPost(data: unknown): data is Post` |
| 입력 검증 | `lib/validators.ts` | 수작업 정규식 + `if` 분기 |

→ **세 곳을 사람이 동기화**해야 함. `Post.author`를 추가하면 `interface`, `isPost`, (필요 시) 폼 검증을 모두 손봐야 한다.

### 적용 후 (zod)

| 책임 | 위치 | 방식 |
|---|---|---|
| 타입 선언 | `lib/schemas.ts` | `z.infer<typeof PostSchema>` |
| 응답 런타임 가드 | `lib/api.ts`, `lib/auth.ts` | `PostSchema.parse(data)` |
| 입력 검증 | `lib/validators.ts` (얇은 어댑터) | `LoginInputSchema.safeParse(...)` |

→ **단일 출처**(`schemas.ts`)에서 세 가지가 자동 파생.

### 변경 내용

**`lib/schemas.ts` (신규)**
- `PostSchema`, `PostListSchema`, `UserSchema`, `LoginResultSchema` — 응답 검증
- `LoginInputSchema` — 폼 검증 (`z.email({ message: ... })`, `z.string().min(8, ...)`)
- `z.infer<>`로 타입 4개 export → `types.ts`가 단순 re-export로 축소

**`lib/api.ts`**
- 수작업 가드(`isPost`, `isPostArray`) 제거
- `PostSchema.parse(data)` 한 줄로 검증 + 타입 좁히기

**`lib/auth.ts`**
- `isUser`, `isLoginResult` 제거
- `LoginResultSchema.parse(data)` 한 줄

**`lib/validators.ts`**
- 정규식 `EMAIL_RE` 제거 → `z.email()`이 대신
- `safeParse` 결과의 첫 번째 issue 메시지를 반환 (UI 표시용)

**`lib/types.ts`**
- 13줄 `interface` 선언 → `export type { ... } from './schemas'` 1줄

### 라인 수 비교 (lib/ 합계)

| 파일 | zod 적용 전 | zod 적용 후 |
|---|---|---|
| `api.ts` | 39 | **21** |
| `auth.ts` | 33 | **12** |
| `validators.ts` | 12 | **10** |
| `types.ts` | 13 | **2** |
| `schemas.ts` | — | 33 (신규) |
| **합계** | **97** | **78** |

코드 19줄 감소 + **수작업 타입 가드 0개** + **수작업 정규식 0개**.

### 보안 규칙 재검증

기존 03 체크리스트 모두 그대로 통과. 추가로:

- **응답 신뢰성** ↑ — 서버가 깨진 응답을 보내도 `parse`가 즉시 throw → 인터셉터(02)가 사용자 친화적 메시지로 변환 → UI(02)가 자동 표시. 한 줄도 더 쓸 필요 없이 02 자산을 흡수.
- **에러 메시지 i18n 자리** — 메시지가 schema에 모여 있어 추후 번역 키로 교체 시 한 파일만 수정.
- **서버 ↔ 클라이언트 스키마 공유** — schemas.ts를 패키지로 분리하면 백엔드(NestJS 등)와 동일 검증 규칙을 공유 가능.

### 평가

**성공.** 동일한 보안 보장을 유지하면서 검증 코드 19줄 감소, 동기화 책임 3곳 → 1곳으로 통합. **타입과 런타임 검증의 불일치 가능성을 컴파일러 수준에서 제거**.

### 주목할 점

- **Zod v4 API 변경 주의** — `z.string().email()`이 v4에서는 `z.email()` 톱레벨 함수로 분리됨. AI에게 규칙 적용 시키면 학습 데이터의 v3 문법을 그대로 쓰는 함정이 있음 (이번에도 한 번 잡았음).
- **`parse` vs `safeParse`** — 응답은 `parse`(throw → 인터셉터 활용), 입력은 `safeParse`(에러를 UI 메시지로). 컨벤션을 명시할 가치가 있음.
- **다음 단계 후보** — `LoginInputSchema`를 react-hook-form `zodResolver`와 결합하면 폼 컴포넌트의 `useState`도 제거 가능. 02→03→zod 흐름의 자연스러운 연장선.

---

## 후속의 후속: react-hook-form + zodResolver

### 측정 일시
2026-04-23

### 목적
zod 스키마(`LoginInputSchema`)를 그대로 폼 라이브러리에 주입해서, **로그인 페이지에서 `useState`와 `onChange` 보일러플레이트까지 제거** 가능한지 확인.

### 변경 내용

**`app/login/page.tsx` (전면 재작성)**
- `useState(email)`, `useState(password)`, `useState(validationError)` → **모두 제거**
- `onChange={(e) => setEmail(e.target.value)}` → **모두 제거** (`{...register('email')}` 한 줄로 대체)
- `validateLogin(email, password)` 수동 호출 → `zodResolver(LoginInputSchema)`로 자동 (제출 시 + `mode: 'onBlur'`로 blur 시점에도)
- 서버 에러는 `setError('root', ...)`로 폼 에러 상태에 통합 → 클라이언트 검증 에러와 같은 채널
- `errors.email?.message`, `errors.password?.message`로 **필드별 에러 메시지** 표시 (이전엔 첫 번째 에러만)
- `aria-invalid` 속성 추가 — a11y 보너스

**`lib/validators.ts`**
- 사용처가 0이 되어 **삭제**. 검증 로직은 `lib/schemas.ts`에 완전히 흡수됨.

### 코드 비교 (로그인 페이지)

| 항목 | useState 버전 | useState + zod | RHF + zodResolver |
|---|---|---|---|
| `useState` 호출 | 4개 | 3개 | **0개** |
| `onChange` 핸들러 | 2개 | 2개 | **0개** |
| `value=` 바인딩 | 2개 | 2개 | **0개** |
| 수동 검증 호출 | 0 | 1줄 (`validateLogin`) | **0** (resolver 자동) |
| 필드별 에러 메시지 | ❌ (단일 메시지) | ❌ (단일 메시지) | ✅ |
| blur 시점 검증 | ❌ | ❌ | ✅ (`mode: 'onBlur'`) |
| 클라/서버 에러 통합 | 분리된 state 2개 | 분리된 state 2개 | **단일 `formState.errors`** |
| 페이지 라인 수 | 53 | 65 | **63** |

> 라인 수 자체는 큰 차이 없지만(zod 메시지·a11y 속성·필드별 에러 표시가 추가됐기 때문), **상태 관리 코드가 0개로 수렴**하고 폼이 제공하는 기능(blur 검증, 필드별 에러, a11y)이 같이 따라옴.

### 보안 규칙 재검증

03 체크리스트의 "입력 검증" 항목 모두 통과. 추가로:

- **검증 우회 방지** — `noValidate`로 브라우저 기본 검증을 끄고 zod 통일 → 메시지/규칙이 한 곳에서만 관리됨
- **a11y 강화** — `aria-invalid`로 스크린리더가 잘못된 필드를 인지

### 평가

**성공.** 03 보안 규칙은 그대로 통과하면서, 폼 컴포넌트에서 **검증·상태·에러 표시**가 모두 라이브러리/스키마로 위임됨. 로그인 페이지는 "UI 마크업 + 제출 핸들러"만 남았다.

### 02→03→zod→RHF 누적 효과

| 영역 | Baseline | 최종 |
|---|---|---|
| 앱 레이어 try-catch | 4곳 | **0곳** |
| `useState(isLoading/error)` | 6개 | **0개** (TanStack Query 흡수) |
| 폼 `useState(value)` | 4개 | **0개** (RHF 흡수) |
| `onChange` 핸들러 | 4개 | **0개** (RHF 흡수) |
| 수작업 타입 가드 | 4개 함수 | **0개** (zod 흡수) |
| 수작업 정규식/검증 if 분기 | 6줄 | **0줄** (zod 흡수) |
| `res.ok` 체크 | 5곳 | **1곳** (axios 인터셉터) |
| 보안 규칙 충족 | ❌ | ✅ (전 항목) |

규칙(컨트랙트)은 동일, 책임은 모두 **라이브러리 + 스키마 한 곳**으로.
