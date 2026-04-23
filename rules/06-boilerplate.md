# Rule 06: Boilerplate Elimination via Pattern Propagation

## 목적
02~05 실험에서 정착한 패턴들을 새 기능에 **일관된 구조로** 자동 적용하여, 페이지·컴포넌트마다 반복되던 보일러플레이트가 사라지는지 검증.

## 패턴 카탈로그 (이미 존재하는 것을 새 기능에도 동일하게)

### 폼 패턴 (login에서 정의됨)
- `useForm<TInput>({ resolver: zodResolver(InputSchema), mode: 'onBlur' })`
- `useMutation({ mutationFn, onSuccess: navigate, onError: setError('root') })`
- 필드별 `errors.X?.message` 표시, `aria-invalid` 속성
- 제출 중 `isSubmitting || mutation.isPending`으로 입력/버튼 잠금

### 리스트 + 변경 패턴 (posts에서 정의됨)
- `useQuery({ queryKey: ['entity'], queryFn })`
- `useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries(['entity']) })`
- `mutation.variables === item.id`로 행별 로딩 상태
- `query.isPending` / `query.isError` 분기 → 조기 반환

### API 패턴 (api.ts에서 정의됨)
- `http.{method}(...)` 호출 → `Schema.parse(data)` 반환
- 응답 검증은 zod 스키마 한 곳

### 스키마 패턴 (schemas.ts에서 정의됨)
- `EntitySchema` (응답) / `EntityInputSchema` (입력) 쌍
- `z.infer<>`로 타입 export

### 위험 API 봉인 패턴 (SafeHtml에서 정의됨)
- 호출부에서 `dangerouslySetInnerHTML` 직접 사용 금지
- 전용 컴포넌트 경유

### 테스트 패턴 (lib/__tests__에서 정의됨)
- `vi.mock('../http')`로 외부 격리
- valid/invalid + 에러 전파 케이스

## 규칙 체크리스트

### 일관성
- [ ] 새 폼은 login과 **동일한 훅 호출 순서**(useForm → useMutation → handleSubmit)
- [ ] 새 리스트는 posts와 **동일한 useQuery+invalidate 구조**
- [ ] 새 API 함수는 api.ts와 **동일한 (`http.x` → `Schema.parse`)** 한 줄 패턴
- [ ] 새 스키마는 `EntitySchema` + `EntityInputSchema` 쌍으로
- [ ] `dangerouslySetInnerHTML`은 호출부 0곳 유지 (`<SafeHtml>` 경유)

### 테스트 자동 동반
- [ ] 새 스키마 → schemas.test.ts에 valid + invalid 케이스 추가
- [ ] 새 API → api.test.ts에 happy + 잘못된 응답 케이스 추가
- [ ] 새 컴포넌트 → 단위 테스트 1개 이상

### 회귀 방지
- [ ] 기존 39개 테스트 모두 GREEN 유지
- [ ] tsc strict / lint 통과

## 적용 대상 (이번 차수)

- `app/posts/new/page.tsx` — 로그인 폼 패턴 propagate
- `components/CommentList.tsx` — 리스트 + 변경 패턴 propagate
- `app/posts/[id]/page.tsx` — `<CommentList postId={...} />` 합성
- `lib/schemas.ts` — `CreatePostInputSchema`, `CommentSchema`, `CommentListSchema`, `CreateCommentInputSchema` 추가
- `lib/api.ts` — `fetchComments`, `createComment` 추가
