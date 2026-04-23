# Rule 10: Storybook / Component Documentation

## 목적
컴포넌트 코드에서 Story를 자동 생성하여 카탈로그·시각 회귀·문서화의 이중 작업을 제거. 02~09에서 정착한 패턴(Provider, i18n, analytics)이 Story에서도 동일하게 동작하도록.

## 규칙 체크리스트

### Story 작성
- [ ] CSF 3.0 형식 (`Meta` + `StoryObj`) 사용
- [ ] 컴포넌트당 최소: default + 주요 상태(loading/error/empty) Story
- [ ] props 변형은 args로 표현 — 인스턴스 생성 코드 중복 금지

### 컨텍스트 (decorators)
- [ ] TanStack Query를 쓰는 컴포넌트는 `QueryClientProvider` decorator
- [ ] 비동기 데이터는 `queryClient.setQueryData`로 캐시 priming → MSW 없이 결정적
- [ ] analytics adapter는 storybook 환경에서 noop 또는 콘솔로 명시

### 회귀 방지
- [ ] `npm run build-storybook` 통과 (Story 빌드 가능 = 컴포넌트 import 그래프 건강)
- [ ] 기존 단위 테스트 모두 통과
- [ ] Story 파일은 컴포넌트와 같은 디렉토리 (`X.tsx` ↔ `X.stories.tsx`)

## 적용 대상
- `components/SafeHtml.stories.tsx` (신규)
- `components/CommentList.stories.tsx` (신규)
- `app/login/Login.stories.tsx` (신규)
- `.storybook/main.ts`, `.storybook/preview.tsx` (신규)
