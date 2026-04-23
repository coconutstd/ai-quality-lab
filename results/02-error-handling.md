# 실험 02: Error Handling 결과

## 측정 일시
2026-04-22

## 베이스라인 (적용 전)

| 항목 | 수치 |
|---|---|
| `res.ok` 체크 | 0곳 |
| `try-catch` | 0곳 |
| `isLoading` 상태 | 0곳 |
| `error` 상태 | 0곳 |
| 버튼 `disabled` 처리 | 0곳 |

## 적용 후

| 항목 | 수치 |
|---|---|
| `res.ok` 체크 | **5곳** (fetch 전체 커버) |
| `try-catch` | **4곳** (async 함수 전체 커버) |
| `isLoading` 상태 참조 | **9곳** |
| `error` 상태 참조 | **9곳** |
| 버튼 `disabled` 처리 | **4곳** (로그인 2 + 삭제 1 + 입력 2) |
| TypeScript strict 에러 | **0** |

## 변경 내용

### lib/api.ts
- 모든 `fetch` 응답에 `res.ok` 체크 추가 → HTTP 4xx/5xx를 에러로 전환

### lib/auth.ts
- `res.ok` 체크 추가
- 서버 에러 응답 본문에서 `message` 파싱 → 사용자 친화적 메시지 전달

### app/login/page.tsx
- `isLoading`, `error` 상태 추가
- `handleSubmit` → async + try-catch + finally
- 제출 중 버튼·입력 비활성화 (중복 클릭 방지)
- 에러 메시지 UI 표시

### app/posts/page.tsx
- `isLoading`, `error`, `deletingId` 상태 추가
- useEffect → async 함수 분리 + try-catch + finally
- `handleDelete` → async + try-catch + finally
- 삭제 중 해당 버튼만 비활성화

### app/posts/[id]/page.tsx
- `isLoading`, `error` 상태 추가
- 3단계 분기: 로딩 중 / 에러 / 데이터 없음 / 정상
- useEffect → async 함수 분리 + try-catch + finally

## 규칙 체크리스트 결과

- [x] 모든 `async/await` 호출에 `try-catch` 필수
- [x] 로딩 상태(`isLoading`) UI 표시
- [x] 에러 상태(`error`) UI 표시 (사용자 읽을 수 있는 메시지)
- [x] 네트워크 에러와 비즈니스 에러 구분 (`res.ok` 체크 + 메시지 파싱)
- [x] `fetch` 응답 `response.ok` 체크
- [x] 사용자에게 에러 피드백 제공
- [x] 폼 제출 중 버튼 비활성화

## 평가

**성공.** 규칙 체크리스트 7개 항목 모두 충족.

### 주목할 점
- **레이어 분리** 자동 적용 — lib는 throw, app은 catch 패턴을 규칙 없이 자연스럽게 구분
- **개별 삭제 중 표시** — 전체 loading이 아닌 `deletingId`로 해당 행 버튼만 비활성화 (규칙에 명시 없었음)
- 보안 이슈(localStorage, dangerouslySetInnerHTML)는 의도적 보존

## 다음 실험
→ `rules/03-security.md` 적용

---

## 후속: axios + TanStack Query 마이그레이션

### 측정 일시
2026-04-23

### 목적
같은 규칙 체크리스트를 충족하면서, 보일러플레이트(try/catch + useState 3종 세트)를 라이브러리 레이어로 옮길 수 있는지 검증.

### 변경 내용

**`lib/http.ts` (신규)**
- `axios.create({ baseURL: '/api' })`로 인스턴스 생성
- `response` 인터셉터에서 4xx/5xx → 사람이 읽을 수 있는 메시지를 가진 `Error`로 변환
  - 서버 응답 본문의 `message` 자동 파싱 (없으면 `서버 오류: <status>`)
  - 네트워크 단절은 별도 메시지(`네트워크에 연결할 수 없습니다`)
- "비즈니스 에러 메시지 파싱"을 호출부마다 반복하던 로직이 한 곳으로 수렴

**`lib/api.ts`, `lib/auth.ts`**
- `await fetch(...) → if (!res.ok) throw ...` 패턴 제거
- `http.get/post/delete`로 단순화 (인터셉터가 status 처리)
- `isPost`/`isLoginResponse` 런타임 검증은 그대로 유지 (실험 01 자산 보존)

**`lib/query-provider.tsx` (신규)**
- `'use client'` `QueryClientProvider` 래퍼
- 기본값: `retry: 1`, `staleTime: 30s`, `refetchOnWindowFocus: false`
- `app/layout.tsx`에서 `<body>` 하위를 감싸 전역 적용

**`app/login/page.tsx`**
- `useState(isLoading/error)` + `try-catch` → `useMutation`
- `mutation.isPending`, `mutation.error`로 그대로 매핑

**`app/posts/page.tsx`**
- 목록: `useQuery({ queryKey: ['posts'] })`
- 삭제: `useMutation` + `invalidateQueries(['posts'])`로 자동 재조회
- 행별 비활성화: `mutation.variables === post.id`로 판정 (별도 `deletingId` state 불필요)

**`app/posts/[id]/page.tsx`**
- `useQuery({ queryKey: ['posts', id] })` 한 줄로 정리
- `isPending` / `isError` / `data` 분기만 남음 (수동 useEffect 제거)

### 적용 후 (axios + TanStack Query)

| 항목 | fetch + useState | axios + TanStack Query |
|---|---|---|
| `try-catch` (앱 코드) | 4곳 | **0곳** (라이브러리가 흡수) |
| `res.ok` 체크 | 5곳 (호출부마다) | **1곳** (인터셉터) |
| `useState(isLoading)` | 3곳 | **0곳** (`isPending` 사용) |
| `useState(error)` | 3곳 | **0곳** (`mutation.error` 사용) |
| `useEffect` 데이터 로딩 | 2곳 | **0곳** |
| 버튼 `disabled` 처리 | 4곳 | **4곳** (동일) |
| TypeScript strict 에러 | 0 | **0** |
| ESLint 에러 | 0 | **0** |

### 규칙 체크리스트 결과 (재검증)

- [x] 모든 `async/await` 호출에 `try-catch` 또는 `.catch()` 필수
  → TanStack Query가 promise rejection을 `error` 상태로 자동 캡처
- [x] 로딩 상태(`isLoading`) UI 반드시 표시
  → `query.isPending` / `mutation.isPending`
- [x] 에러 상태(`error`) UI 반드시 표시
  → `query.error.message` / `mutation.error.message`
- [x] 네트워크 에러와 비즈니스 에러 구분 처리
  → 인터셉터에서 `error.request` vs `error.response` 분기
- [x] `fetch` 응답 `response.ok` 체크 필수
  → axios가 `validateStatus` 기본값으로 처리, 인터셉터로 통일
- [x] 사용자에게 에러 피드백 제공
  → 모든 페이지에 `<p style={{color:'red'}}>` 메시지 렌더
- [x] 폼 제출 시 중복 클릭 방지
  → `isPending`으로 input/button 비활성화, 삭제는 `variables` 매칭으로 행별 잠금

### 평가

**성공.** 같은 7개 규칙 항목을 충족하면서, 앱 레이어의 try-catch와 로딩/에러 useState를 모두 제거. 규칙은 "도구"에 종속되지 않고 컨트랙트로 동작함을 확인.

### 주목할 점

- **에러 메시지 일원화** — 서버 `{ message }` 파싱 로직이 `lib/auth.ts`에서 `lib/http.ts`로 이동, `lib/api.ts`도 자동 혜택
- **행별 로딩 상태가 무료** — `mutation.variables === post.id` 패턴으로 별도 `deletingId` state 제거
- **삭제 후 재조회 단순화** — `invalidateQueries`가 수동 `fetchPosts()` 재호출을 대체
- **새 규칙 후보** — "QueryClient 기본 옵션(`retry`, `staleTime`)을 명시", "mutation은 `onSuccess`에서 `invalidateQueries` 호출"
