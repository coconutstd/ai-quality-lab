# Rule 09: Analytics / Monitoring

## 목적
주요 사용자 액션과 결과를 한 곳에서 정의된 이벤트로 일괄 추적. Sentry/GA/PostHog 등 실 어댑터로 1:1 치환 가능한 인터페이스 유지.

## 규칙 체크리스트

### 이벤트 카탈로그
- [ ] 이벤트 이름은 `EventName` literal union으로 컴파일 시점 보호
- [ ] 이벤트별 properties shape를 타입으로 강제 (오타·누락 컴파일 에러)
- [ ] 도메인 네임스페이스 (`auth.*`, `post.*`, `comment.*`)

### 적용 대상 (모든 사용자 액션)
- [ ] 폼 제출 시도 / 성공 / 실패 — 각각 별개 이벤트
- [ ] 페이지 진입 (view 이벤트)
- [ ] 파괴적 액션 (삭제 등) attempt + success + failure

### 어댑터
- [ ] 기본 어댑터는 no-op (테스트/SSR 안전)
- [ ] `setAdapter(...)`로 런타임 교체
- [ ] 콘솔/Sentry/PostHog 등 어댑터는 동일 시그니처

### 회귀 방지
- [ ] 모든 `useMutation`은 `onSuccess` + `onError`에서 track
- [ ] 모든 페이지 진입은 `useEffect`로 view 이벤트
- [ ] 단위 테스트로 어댑터가 호출되는지 검증

## 적용 대상
- `lib/analytics/events.ts` (신규)
- `lib/analytics/index.ts` (신규)
- `app/login/page.tsx`
- `app/posts/page.tsx`
- `app/posts/new/page.tsx`
- `app/posts/[id]/page.tsx`
- `components/CommentList.tsx`
