# 실험 05: Refactoring (with Test Safety Net) 결과

## 측정 일시
2026-04-23

## 베이스라인 (실험 04 직후)

| 항목 | 수치 |
|---|---|
| 테스트 통과 | 29/29 |
| `dangerouslySetInnerHTML` 직접 사용 | 1곳 (`app/posts/[id]/page.tsx`) |
| `lib/http.ts`의 에러 변환 | 인터셉터 화살표 함수 안에 매립 (테스트 불가) |

## 적용 후

| 항목 | 수치 |
|---|---|
| 테스트 통과 | **39/39** (+10개) |
| `dangerouslySetInnerHTML` 직접 사용 | **1곳** (단, `components/SafeHtml.tsx` 내부에만) |
| 호출부에서 `dangerouslySetInnerHTML` 사용 | **0곳** |
| `toFriendlyError` 직접 단위 테스트 | **6 cases** |
| `<SafeHtml>` 컴포넌트 단위 테스트 | **4 cases** |
| TypeScript strict 에러 | 0 |
| ESLint 에러 | 0 |
| 공개 API 시그니처 변경 | 없음 |

## 변경 내용

### 리팩터 1: `<SafeHtml>` 컴포넌트로 위험 API 봉인

**Before**
```tsx
// app/posts/[id]/page.tsx
const safeHtml = useMemo(
  () => (postQuery.data ? sanitizeHtml(postQuery.data.content) : ''),
  [postQuery.data],
)
// ...
<div dangerouslySetInnerHTML={{ __html: safeHtml }} />
```

**After**
```tsx
// components/SafeHtml.tsx (신규)
export function SafeHtml({ html, ...divProps }: SafeHtmlProps) {
  const safe = useMemo(() => sanitizeHtml(html), [html])
  return <div {...divProps} dangerouslySetInnerHTML={{ __html: safe }} />
}

// app/posts/[id]/page.tsx
<SafeHtml html={post.content} />
```

→ `dangerouslySetInnerHTML`을 호출부에서 직접 다룰 일이 사라짐. **잘못 쓰기 어려운 형태**(잊고 sanitize 안 하는 패턴이 불가능).

### 리팩터 2: `toFriendlyError` 순수 함수 추출

**Before** — 인터셉터 콜백 안에 익명으로 매립되어 단위 테스트 불가능했던 로직.

**After**
```ts
// lib/http.ts
export function toFriendlyError(error: AxiosError): Error { ... }

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => Promise.reject(toFriendlyError(error)),
)
```

→ axios 인터셉터를 모킹하지 않고 **함수 단독으로** 테스트 가능. 인터셉터는 thin wrapper로 축소.

### 새 테스트 (10개)

**`lib/__tests__/http.test.ts` (6 cases)**
- 4xx + `{ message: ... }` → 서버 메시지 노출
- 4xx + 메시지 없음 → `서버 오류: <status>` fallback
- 4xx + 응답 본문이 객체 아님 → 같은 fallback
- 네트워크 단절(`request` only) → `네트워크에 연결할 수 없습니다`
- 설정 에러(`message`만) → 원본 메시지 전달
- 빈 에러 → `알 수 없는 오류`

**`components/__tests__/SafeHtml.test.tsx` (4 cases)**
- 화이트리스트 마크업 렌더
- `<script>` 제거
- 인라인 이벤트 핸들러(`onclick`) 제거
- 추가 div props(`className`, `data-testid`) forwarding

## 규칙 체크리스트 결과

### 안전망
- [x] 리팩터링 직전 — 변경 영역의 동작이 04 실험에서 이미 잠겨 있었음 (sanitize 6 cases)
- [x] 모든 단계에서 GREEN 유지 (29 → 33 → 35 → 39)
- [x] 외부 동작(`PostDetailPage`의 렌더 결과, `http`의 호출/에러 동작) 변화 없음

### 리팩터링 방향
- [x] 위험 API 봉인 — `dangerouslySetInnerHTML`이 컴포넌트 한 곳으로 격리
- [x] 단일 출처 — `sanitizeHtml` 호출이 `SafeHtml` 한 곳에서만 발생
- [x] 사용 지점에서 안전 — 호출부는 `<SafeHtml html={...} />`만 쓸 수 있음
- [x] 테스트 가능성 향상 — `toFriendlyError`가 axios 의존 없이 단위 테스트 가능

### 검증
- [x] `npm run test:run` 39/39 GREEN
- [x] `npx tsc --noEmit --strict` 통과
- [x] `npm run lint` 통과
- [x] 기존 호출부 동작 변화 없음 (api/auth 테스트 11개가 그대로 통과 → 인터셉터 동작 동일 보장)

## 평가

**성공.** 04에서 깐 안전망 위에서 **외부 동작 0% 변경 + 내부 구조 개선**을 달성. 테스트는 리팩터링 동안 한 번도 RED가 되지 않음.

### 안전망의 효과 (체감)

- `lib/http.ts` 변경 직후 `auth.test.ts`의 "propagates server error from interceptor" 케이스가 **자동으로** 인터셉터의 새 구조를 검증해줬음. 회귀가 있었다면 즉시 RED.
- `SafeHtml` 도입 후 `PostDetailPage` 렌더는 직접 테스트 안 했지만, `SafeHtml` 자체 테스트 + `sanitize` 테스트 조합이 **위임 대상 모두를 커버**.

### 향후 강제 가능 (lint rule 후보)

```json
// .eslintrc 후보
"react/no-danger": ["error", {
  "allow": ["components/SafeHtml.tsx"]
}]
```

→ 이 규칙을 켜는 순간, 누군가 호출부에서 `dangerouslySetInnerHTML`을 다시 쓰려 하면 lint가 막아줌. 봉인이 코드 컨벤션이 아닌 **빌드 단계의 강제력**이 됨.

### 04 → 05 흐름의 의미

| 단계 | 역할 |
|---|---|
| 04. 테스트 작성 | "지금 동작"을 명문화 (안전망) |
| 05. 리팩터링 | 안전망 위에서 구조 변경 (위험 API 봉인 + 테스트 가능성 ↑) |
| (다음 후보) ESLint rule | 봉인을 빌드 단계에서 강제 |

→ "동작하는 코드 건드리는 두려움"이 **테스트 → 리팩터 → 강제** 사이클로 사라지는 패턴. AI가 두 단계(테스트 작성 + 리팩터링)를 한 번에 수행하므로 사람의 인지 비용은 "리뷰" 한 번뿐.

## 다음 실험 후보

- 06. ESLint rule로 `dangerouslySetInnerHTML` 봉인 강제
- 06. 폼 통합 테스트 — `@testing-library/user-event`로 RHF 동작 검증
- 06. CI 워크플로우 — GitHub Actions로 자동 검증
