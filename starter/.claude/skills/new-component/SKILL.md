---
name: new-component
description: 재사용 가능한 React 컴포넌트를 **4종 산출물이 한 트랜잭션으로** 생기도록 스캐폴드한다. 트리거는 "새 컴포넌트 X 만들어줘", "재사용 컴포넌트 Y 추가", "components/에 Z 넣어줘" 같은 요청. 기존 CommentList/SafeHtml 패턴(useId·aria-*·Story decorator·i18n 카탈로그)을 그대로 따른다. 사용자가 `한 파일만`을 명시적으로 요구하지 않는 한 네 산출물을 모두 만들 것.
---

# new-component — 컴포넌트 계층 자동 적용 스킬

## 배경 (실험 13)

개별 실험 07(a11y) · 08(i18n) · 10(Storybook)에서 각 항목이 AI로 잘 처리됨을 확인했지만, **한 번에 묶어서** 트리거되는지는 별개 문제였다.
이 스킬은 "컴포넌트 생성" 이라는 단일 트리거에 위 세 항목 + 단위 테스트(실험 04)가 **동시 산출**되도록 강제한다.

## 산출물 계약 (Output Contract)

컴포넌트 이름을 `Name` (PascalCase), 슬러그를 `name` (kebab/lowercase) 이라 하자. **반드시 아래 4종을 한 트랜잭션으로** 작성한다.

| # | 경로 | 역할 |
|---|---|---|
| 1 | `components/{Name}.tsx` | 컴포넌트 구현 |
| 2 | `components/{Name}.stories.tsx` | Storybook 케이스 (최소 2개) |
| 3 | `components/__tests__/{Name}.test.tsx` | 단위 테스트 (최소 2개) |
| 4 | `lib/i18n/messages.ts` 에 key 추가 (ko + en 동시) | 컴포넌트가 사용자 대면 텍스트를 가질 때만 |

텍스트가 전혀 없는 pure presentational 컴포넌트라면 4번은 생략 가능. 나머지 3개는 **항상** 필요.

## 컴포넌트(1) 작성 규칙

### 타입·에러·보안 (항상 계층 — 실험 12 hook도 강제)
- `any` 금지. 모르는 props는 제네릭 또는 `unknown` + narrowing.
- Props는 `interface {Name}Props extends HTMLAttributes<HTMLElement>` 로 확장 가능하게.
- 외부 입력(HTML 등)은 `<SafeHtml />` 로만 렌더.

### a11y (실험 07)
- 폼 입력: `useId()`로 고유 id → `<label htmlFor={id}>` + `aria-describedby`(에러용) + `aria-invalid`.
- 에러 메시지: `role="alert"`.
- 로딩/상태: `role="status" aria-live="polite"`.
- 폼 제출 영역: `aria-busy={isLoading}`.
- 버튼: `type="button"` 기본(submit이 아니면), `disabled` 상태 시 `aria-busy` 또는 loading 텍스트.
- 정보 섹션: `aria-label` 또는 `aria-labelledby`.

### i18n (실험 08)
- 사용자 대면 텍스트 **하드코딩 금지**. 전부 `t('key')` 로.
- 키 네이밍: `{name}.{slot}.{variant}` (예: `alert.button.dismiss`, `alert.message.error`).
- placeholder 보간: `t('key', { var: value })` — `{var}` 토큰을 카탈로그에 명시.

### analytics (실험 09, 해당 시)
- 사용자 액션이 있으면 `track('{name}.{event}.{status}', payload)` 호출.
- PII 금지 (원본 이메일/이름 X, 도메인/id만).

## 스토리(2) 작성 규칙

- `Meta<typeof {Name}>` 타입 사용, `title: 'Components/{Name}'`.
- 최소 **2개 스토리** — 기본 케이스 + 주요 변형/에러/로딩 중 하나 이상.
- 외부 의존(TanStack Query, i18n locale 등)은 **decorator로 주입**. 예: `QueryClientProvider` with primed cache, `setLocale('en')`.
- `args`로 props 전달. 캐시 priming 같은 부수효과는 decorator 안에서.
- Storybook docs description은 **왜 이 케이스가 존재하는지**를 한 줄로.

## 테스트(3) 작성 규칙

- 파일: `components/__tests__/{Name}.test.tsx`.
- `describe('<{Name}>')` 블록 아래 **최소 2개 `it`**.
  1. **렌더 정합성**: 주요 텍스트/구조가 DOM에 나타나는지.
  2. **행동 or a11y**: 사용자 상호작용(click/type) 또는 aria-* 속성 검증.
- `@testing-library/react`의 `render` + `screen` 사용. `@testing-library/user-event`의 `userEvent.setup()` 권장.
- i18n 의존 시 테스트 setup에서 `setLocale('ko')` 고정 또는 키 기반 검증.

## i18n 카탈로그 갱신(4) 규칙

- `lib/i18n/messages.ts`의 **`ko`와 `en` 두 객체에 동시에** 키를 추가. TypeScript가 두 객체 shape 평행성을 컴파일 타임에 강제한다(`Record<keyof typeof ko, string>`).
- 키는 알파벳 순이 아니라 **컴포넌트 섹션별로 묶어** 기존 그룹 뒤에 추가 (기존 comment/login/post 블록 스타일 유지).
- placeholder 토큰명은 ko/en에서 동일해야 함 (`{message}`, `{count}` 등).

## 완료 체크리스트 (스킬 종료 전 필수)

- [ ] 4개 파일(텍스트 없으면 3개) 모두 생성
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과  
- [ ] `npm run test:run` 통과 (신규 테스트 포함)
- [ ] 컴포넌트가 `any` 포함하지 않음 (hook이 block하지만 재확인)
- [ ] i18n key가 ko/en 양쪽에 존재 (TS 컴파일이 강제)

한 항목이라도 실패하면 **완료 보고 금지**. 수정 후 재검증.

## 레퍼런스 (반드시 참고)

이 프로젝트에 이미 있는 컴포넌트·테스트·i18n 카탈로그 파일을 표준 패턴으로 참고한다.
초기 설치 직후엔 레퍼런스가 없으므로, 첫 컴포넌트는 이 SKILL 본문의 규격을 그대로 따르고 이후 다른 컴포넌트의 1차 레퍼런스 역할을 하게 된다.

i18n 카탈로그 초기 구조 권장안 — `ko`/`en` 평행성을 TS 컴파일러가 강제하게:

```ts
export const ko = { 'key.name': '한국어' } as const
export const en: Record<keyof typeof ko, string> = { 'key.name': 'English' }
```
