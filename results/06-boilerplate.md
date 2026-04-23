# 실험 06: Boilerplate Elimination 결과

## 측정 일시
2026-04-23

## 베이스라인 (실험 05 직후)

| 항목 | 수치 |
|---|---|
| 폼 패턴 사용처 | 1곳 (login) |
| 리스트+변경 패턴 사용처 | 1곳 (posts) |
| `Schema.parse` API 함수 | 5개 |
| 깨진 링크 | 1개 (`/posts/new`) |
| 단위 테스트 | 39개 |

## 적용 후 (패턴 propagate)

| 항목 | 수치 |
|---|---|
| 폼 패턴 사용처 | **3곳** (login + new-post + comment) |
| 리스트+변경 패턴 사용처 | **2곳** (posts + comments) |
| `Schema.parse` API 함수 | **7개** (+2 comments) |
| `aria-invalid` 입력 | **5개** (모든 폼 일관) |
| `dangerouslySetInnerHTML` 호출부 | **0개** (SafeHtml 봉인 유지) |
| 단위 테스트 | **58개** (+19) |
| TypeScript strict 에러 | 0 |
| ESLint 에러 | 0 |
| 깨진 링크 | 0개 |

## 새로 만든 것

### 페이지/컴포넌트
- `app/posts/new/page.tsx` — 게시글 작성 폼
- `components/CommentList.tsx` — 댓글 목록 + 작성 폼
- `app/posts/[id]/page.tsx` — `<CommentList postId={postId} />` 합성 (3줄 추가)

### 도메인 (lib/schemas.ts에 추가)
- `CommentSchema`, `CommentListSchema` — 응답
- `CreatePostInputSchema` — 제목 1~120, 본문 1자 이상
- `CreateCommentInputSchema` — 본문 1~1000자
- `Comment`, `CreatePostInput`, `CreateCommentInput` 타입 export

### API (lib/api.ts에 추가)
- `fetchComments(postId)` — `GET /posts/{id}/comments`
- `createComment(postId, body)` — `POST /posts/{id}/comments`

### 테스트 (+19 cases)
- `lib/__tests__/schemas.test.ts` — Comment/CreatePost/CreateComment 스키마 +11
- `lib/__tests__/api.test.ts` — fetchComments/createComment +4
- `components/__tests__/CommentList.test.tsx` — 4 케이스 (렌더, 빈 상태, zod 검증 차단, mutation 호출)

## 패턴 일관성 감사

### 폼 패턴 (login에서 정의 → 3곳에서 동일 구조)

| 위치 | `useForm<T>(zodResolver(...))` | `useMutation(onError: setError('root'))` | `aria-invalid` | `disabled={isLoading}` |
|---|---|---|---|---|
| `app/login/page.tsx` | ✅ | ✅ | ✅ (2곳) | ✅ |
| `app/posts/new/page.tsx` | ✅ | ✅ | ✅ (2곳) | ✅ |
| `components/CommentList.tsx` | ✅ | ✅ | ✅ (1곳) | ✅ |

→ **3개 폼 모두 동일한 훅 호출 순서·동일한 에러 채널·동일한 a11y 속성**.

### 리스트+변경 패턴 (posts에서 정의 → 2곳에서 동일 구조)

| 위치 | `useQuery({ queryKey, queryFn })` | `useMutation` | `invalidateQueries` | `isPending` 조기 반환 |
|---|---|---|---|---|
| `app/posts/page.tsx` | ✅ `['posts']` | ✅ delete | ✅ `['posts']` | ✅ |
| `components/CommentList.tsx` | ✅ `['posts', id, 'comments']` | ✅ create | ✅ same key | ✅ |

→ **queryKey 계층화도 일관** (`['posts']` → `['posts', id, 'comments']`).

### API 패턴 (api.ts 7개 함수 모두)

```ts
const { data } = await http.{method}(...)
return Schema.parse(data)
```

→ 7개 함수 전부 **두 줄 패턴**으로 통일. 수작업 가드 0개.

### 위험 API 봉인 패턴

`dangerouslySetInnerHTML` 호출부 0건 유지. 새 페이지 추가에도 `SafeHtml` 경계는 깨지지 않음.

## 규칙 체크리스트 결과

### 일관성
- [x] 새 폼은 login과 동일한 훅 호출 순서
- [x] 새 리스트는 posts와 동일한 useQuery+invalidate 구조
- [x] 새 API 함수는 (`http.x` → `Schema.parse`) 한 줄 패턴
- [x] 새 스키마는 `EntitySchema` + `EntityInputSchema` 쌍
- [x] `dangerouslySetInnerHTML` 호출부 0곳 유지

### 테스트 자동 동반
- [x] 새 스키마 → schemas.test.ts에 valid + invalid 케이스 11개
- [x] 새 API → api.test.ts에 happy + 잘못된 응답 4개
- [x] 새 컴포넌트 → CommentList.test.tsx 4개

### 회귀 방지
- [x] 기존 39개 + 신규 19개 = 58/58 GREEN
- [x] tsc strict / lint 통과

## 평가

**성공.** 새 페이지 1개 + 새 컴포넌트 1개를 추가했지만 **새로운 패턴은 0개 도입**됨. 02~05에서 정착한 패턴들이 그대로 propagate.

### 보일러플레이트 절감 (정성적)

같은 기능을 baseline 스타일(useState + 수동 검증 + try-catch + 수작업 가드)로 짰다면 대략:

- `app/posts/new/page.tsx` — 기존 스타일 100~120줄 예상 → 실제 **64줄**
- `components/CommentList.tsx` — 기존 스타일 130~150줄 예상 → 실제 **89줄**

수치 자체보다, **"이번엔 어떻게 검증하지/에러 처리는 어떻게 하지/타입 가드 어떻게 짜지" 결정 비용이 0**이라는 점이 핵심.

### AI에게 시킨 입력의 형태

이번 작업은 패턴을 명시적으로 보여주지 않았음에도 일관성이 유지됨. 이유:

1. **패턴이 코드베이스에 응축돼 있음** (login → 새 폼, posts → 새 리스트)
2. **rules/06-boilerplate.md가 패턴 카탈로그를 명시**
3. **기존 테스트가 컨트랙트를 잠금** — 어긋난 구조면 테스트 보일러플레이트도 어긋남 → 즉시 발견

→ 즉, AI에게 "패턴을 한 번 보여주면 일관된 구조로 계속 생성"이 성립하려면, 코드·문서·테스트가 **세 면을 동시에 잠그고** 있어야 함을 확인.

### 함정 — 한 번 잡힌 것

- `<li><strong>{c.author}</strong>: {c.body}</li>`에서 `findByText('첫 댓글')` 정확 매치 실패 → `<li>` 안 텍스트가 `: 첫 댓글`로 합쳐짐. 정규식 `findByText(/첫 댓글/)`로 수정. **테스트 작성 시 마크업 구조에 따른 텍스트 분리에 주의**.

## 누적 효과 (Baseline → 실험 06 직후)

| 영역 | Baseline | Now |
|---|---|---|
| 페이지·컴포넌트 수 | 3 | 5 (+ 신규 2) |
| API 함수 | 4 (수작업 가드) | **7 (zod parse)** |
| 단위 테스트 | 0 | **58** |
| 폼 보일러플레이트 (`useState`+`onChange`) | 4쌍 | **0** |
| 에러 처리 보일러플레이트 (try-catch) | 4곳 | **0** |
| 보안 위험 노출 | 3건 | **0** |
| 검증 책임 분산 | 3곳 | **1곳** (schemas.ts) |

## 다음 실험 후보

- 07. ESLint rule로 `dangerouslySetInnerHTML`·`localStorage` 사용 빌드 단계 차단
- 07. CI 워크플로우 — GitHub Actions로 자동 검증
- 07. Storybook — 컴포넌트 카탈로그 자동 생성 (패턴 propagate의 시각적 카운터파트)
