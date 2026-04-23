# 실험 10: Storybook 결과

## 측정 일시
2026-04-23

## 베이스라인 (실험 09 직후)

| 항목 | 수치 |
|---|---|
| Story 파일 | 0개 |
| 컴포넌트 카탈로그 | 없음 |
| 비주얼 회귀 가능성 | 없음 |
| 단위 테스트 | 69개 |

## 적용 후

| 항목 | 수치 |
|---|---|
| Story 파일 | **3개** (components 2 + pages 1) |
| Story 케이스 | **11개** |
| `build-storybook` 빌드 | **통과** (2.7s, static export) |
| 단위 테스트 | **69개** (그대로) |
| TypeScript strict 에러 | 0 |
| ESLint 에러 | 0 |

## 변경 내용

### 인프라 (신규)
- `.storybook/main.ts` — `@storybook/react-vite`, `@/` 별칭 직접 매핑 (vite-tsconfig-paths 호환 우회)
- `.storybook/preview.tsx` — `QueryClientProvider` decorator 전역 + analytics adapter를 `consoleAdapter`로 (스토리북 환경에서 이벤트 가시화)
- `package.json` — `npm run storybook`, `npm run build-storybook`
- `eslint.config.mjs` — `storybook-static/` ignore

### Story 파일

**`components/SafeHtml.stories.tsx` (5 cases)**
- `WhitelistedMarkup` — 기본 허용 마크업
- `ScriptStripped` — `<script>` 태그 제거 검증
- `InlineHandlerStripped` — `onclick=` 제거 검증
- `RealWorldPost` — 실제 블로그 포스트 풍의 마크업
- `WithCustomClassName` — div props forward 확인

**`components/CommentList.stories.tsx` (4 cases)**
- `Empty` — 빈 댓글 상태
- `WithComments` — 3개 댓글 렌더
- `Loading` — 무한 대기 queryFn으로 진짜 로딩 상태
- `Error` — 실패 queryFn으로 에러 상태

**`app/login/Login.stories.tsx` (2 cases)**
- `Default` — 기본 렌더
- `PreFilledForInteractionTesting` — 검증 메시지/`isPending` 흐름 확인용

### Storybook 안에서 동작하는 자산들

- **TanStack Query**: `preview.tsx`의 글로벌 decorator + 스토리별 `setQueryData`로 결정적 상태 (MSW 없이도 충분)
- **i18n**: `preview.tsx` import만으로 자동 동작 (locale=ko)
- **Analytics**: `consoleAdapter` 주입 → 스토리북 콘솔에서 `[track] event ...` 로그 확인 가능
- **a11y**: 모든 컴포넌트의 `aria-*`가 그대로 렌더 → `@storybook/addon-a11y`로 회귀 검사 가능 (다음 단계)

## 규칙 체크리스트 결과

### Story 작성
- [x] CSF 3.0 (`Meta` + `StoryObj`)
- [x] 컴포넌트당 default + 주요 상태 모두 커버
- [x] props 변형은 `args`로

### 컨텍스트 (decorators)
- [x] `QueryClientProvider`는 preview 글로벌
- [x] `setQueryData` priming으로 결정적 상태 (MSW 불필요)
- [x] analytics adapter 명시 (`consoleAdapter`)

### 회귀 방지
- [x] `npm run build-storybook` 통과 → import 그래프 건강
- [x] 기존 69 테스트 모두 GREEN
- [x] Story 파일은 컴포넌트와 같은 디렉토리

## 평가

**성공.** 컴포넌트 코드만 보고 11개 Story 케이스를 일괄 생성. 02~09에서 만든 자산(Query Provider, i18n, analytics, a11y, 봉인된 SafeHtml)이 **Story 안에서 그대로 동작**.

### 함정 — 환경 호환성 (실시간으로 잡은 것 4개)

| 시도 | 문제 | 해결 |
|---|---|---|
| Storybook 10 | Node 20.19+ 요구 (현재 20.14) | Storybook 9로 다운그레이드 |
| `vite-tsconfig-paths`로 별칭 | esbuild loader가 `tsconfck` ESM exports 못 찾음 | `viteFinal`에서 `resolve.alias`로 직접 매핑 |
| 백슬래시 이스케이프 | 문자열 안 `\\'`가 토크나이저 실패 | 큰따옴표로 감싸 작은따옴표 그대로 사용 |
| 익명 decorator 함수 | `react/display-name` 에러 | named function + `displayName` 부여 |

→ 실 사용자가 **AI에게 "Storybook 깔아줘"라고 시켰을 때 마주칠 현실적 비용**을 그대로 기록.

### 캐시 priming 전략 (눈여겨볼 부분)

```ts
// MSW 없이도 결정적 스토리
client.setQueryData(['posts', 10, 'comments'], [...])

// 로딩 상태는 무한 대기 queryFn
queryFn: () => new Promise(() => {})

// 에러 상태는 reject queryFn
queryFn: () => Promise.reject(new Error('서버 오류: 500'))
```

→ 외부 의존성 없이 **모든 query 상태를 시각화** 가능. 실 백엔드가 없는 본 lab과 잘 맞음.

### 누적 패턴과의 시너지

- **04 테스트** + **10 스토리북**: 같은 컴포넌트가 단위 테스트(`render` + `expect`) + 시각 스토리(`render` + 사람 검수) 양쪽에서 안전망 제공. 둘 다 컴포넌트 호출 패턴이 같아 작성 비용 거의 동일.
- **05 SafeHtml 봉인** + **10 스토리북**: 호출부가 `<SafeHtml html={...} />` 한 모양뿐이라 Story도 `args.html`만 바꾸면 모든 케이스 표현 가능.
- **06 패턴 propagate** + **10 스토리북**: `<CommentList>`의 디자인이 일관되니 같은 decorator 패턴이 새 리스트 컴포넌트에도 그대로 적용 가능.
- **08 i18n** + **10 스토리북**: 스토리에서 `setLocale('en')` 후 동일 컴포넌트 렌더만으로 다국어 카탈로그 검수 (다음 단계).

## 누적 효과 (Baseline → 10)

| 영역 | Baseline | Now |
|---|---|---|
| 단위 테스트 | 0 | **69** |
| Story 케이스 | 0 | **11** |
| 사용자 액션 추적 | 0 | **15** |
| i18n 키 | 0 | **42** (ko+en) |
| a11y 폼 입력 연결 | 0/5 | **5/5** |
| 보안 위험 | 3 | **0** |
| 폼 보일러플레이트 | 4쌍 | **0** |
| 검증 책임 분산 | 3곳 | **1곳** |

## 다음 실험 후보

- 11. `@storybook/addon-a11y` — 자동 a11y 검수 (07의 컨트랙트가 시각 회귀 도구로 잠김)
- 11. Story 기반 시각 회귀 — Chromatic 또는 Playwright + 스크린샷
- 11. CI 워크플로우 — lint + tsc + test + build-storybook 자동화
