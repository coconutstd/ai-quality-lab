# 실험 16 — 하네스 실작동 관측 (Post 편집 + 삭제 확인 기능 추가 중)

## 목적

실험 01~15에서 구축한 **5개 하네스 계층**이 실제 기능 개발 중에 진짜로 작동하는지,
어디가 빠뜨리는지 1인 세션 실측으로 관측한다. 완성 증명(이전 실험)과 달리,
이 실험은 **사용 중 관찰(observed-in-use)** 을 기록한다.

## 개발한 기능

1. `ConfirmDialog` 재사용 컴포넌트 — 파괴적 액션 확인 다이얼로그
2. `updatePost` API + `/posts/[id]/edit` 페이지 — 포스트 편집
3. 포스트 목록/상세의 "즉시 삭제"를 ConfirmDialog 플로우로 교체
4. 상세 페이지에 편집 링크 + 삭제 버튼 추가

## 정량 결과 (세션 종료 시점)

| 지표 | 이전 | 이후 | 변화 |
|---|---|---|---|
| 단위 테스트 | 74 | **83** | +9 |
| Storybook 스토리 | 14 | **17** | +3 |
| 컴포넌트 | 3 | **4** (ConfirmDialog 추가) | +1 |
| i18n 키 (ko/en 평행) | 43 | **63** | +20 |
| 분석 이벤트 타입 | 16 | **23** | +7 |
| 파일 편집 수 | — | ~15 | — |
| `pr:gate` 최종 결과 | — | **✅ 6/6 green** | — |
| `guard-always-layer` 차단 | — | **0건** (false-positive 0 유지) | — |

## 작동 관찰 — 잘 잡은 것

### ✅ 1. PreToolUse guard — 아무 것도 안 막았다 (좋은 의미)

이번 세션에서 Write/Edit 호출이 15회 정도였는데 **단 한 번도 차단되지 않음**.
R1~R5 유혹 상황이 거의 없었다는 뜻:

- 뮤테이션 콜백에 `any` 쓸 뻔했지만 `(err: Error, postId)` 로 바로 구체화됨
- 로컬 스토리지? httpOnly 쿠키 전제가 이미 깔려 있어 생각조차 안 남
- `dangerouslySetInnerHTML`? `<SafeHtml />` 봉인이 내재화됨
- 콘솔 토큰? `track()` 어댑터가 먼저 떠오름

**해석**: Hard 규칙이 "안 어겨서 차단도 없는" 상태는 하네스가 행동을 바꿨다는 신호.
False-positive 0건 검증(실험 12)과 맞물려 규칙의 보존 근거가 강화됨.

### ✅ 2. TypeScript + EventMap 컴파일 강제가 사실상 하네스 역할

- `lib/analytics/events.ts`의 `EventMap` 에 없는 이벤트로 `track()` 호출 → 즉시 컴파일 에러
- 새 이벤트 `confirm.dialog.open/confirm/cancel`, `post.update.*`, `post.edit.view` 추가를
  AI가 **자발적으로** (= 빨간 줄을 보고 역추적) 수행
- `Record<keyof typeof ko, string>` 덕에 ko 20개 키 추가 후 en 누락 시 컴파일 에러 →
  자발적으로 en 동시 갱신

**해석**: 정적 패턴 hook이 아니라 **타입 설계가 Hard 차단 역할**을 하는 케이스.
Hook과 다르게 "왜 막혔는지" 설명이 자동 내장되어 있다.

### ✅ 3. `new-component` SKILL이 4종 산출을 실제로 트리거

ConfirmDialog 하나 만들자고 시작 → 자연스럽게:
- `components/ConfirmDialog.tsx`
- `components/ConfirmDialog.stories.tsx` (3 스토리: Default/Danger/Confirming)
- `components/__tests__/ConfirmDialog.test.tsx` (7 케이스)
- `lib/i18n/messages.ts` 키 4개 추가 (ko/en)

이 산출물 구조가 선언적으로 정해져 있는 게 진짜 효과. 각 실험(04/07/08/10) 체크리스트를
따로 떠올릴 필요가 없음 — **SKILL 한 곳에 통합**되어 있음.

### ✅ 4. `audit-components --strict` 가 pr:gate에서 방어선 역할

세션 중간에 누락이 있었다면 (예: 스토리 안 쓰고 컴포넌트만 넣었다면) pr:gate 4단계에서
red로 멈췄을 것. 실제로 이번엔 Skill을 따라가서 멈추지 않았다 — **positive case 확인**.

### ✅ 5. `pr:gate` 전체 ~5초 안에 끝남 — "무겁다" 고 느껴지지 않음

11 파일 83 테스트 실행 포함. 로컬 pre-push / CI 양쪽에서 부담 없는 수준이 유지됨.

## 작동 관찰 — 놓치거나 개선해야 할 것

### ⚠️ G1. `SessionEnd` audit 이 세션 중간에는 침묵

`audit-components` 는 SessionEnd 훅이라 세션이 끝나야 누락 경고가 뜬다.
이번엔 내가 pr:gate 를 명시 실행해서 잡았지만, 일반 사용자는 세션 끝까지 알 수 없음.

**개선안**: `new-component` Skill 완료 직후 훅이 자동으로 audit을 한 번 호출하도록 권장.
또는 PostToolUse 훅에서 `components/*.tsx` Write 시점에 즉시 감사.

### ⚠️ G2. `new-component` SKILL이 `EventMap` 갱신을 명시하지 않음

SKILL.md 는 "사용자 액션이 있으면 track('...')" 라고만 함. 그러나 실제로는 **먼저
`lib/analytics/events.ts::EventMap` 에 새 이벤트 타입을 추가해야** 컴파일이 통과한다.

AI는 TypeScript 에러를 보고 역추적해서 EventMap을 갱신했지만, 이건 **암묵지**다.
Skill 읽는 사람(또는 AI)이 한 번에 이해하게 하려면:

**개선안**: SKILL.md 완료 체크리스트에 아래 항목 추가:
- [ ] 새 analytics 이벤트 사용 시 `lib/analytics/events.ts::EventMap` 에 타입 먼저 추가

### ⚠️ G3. ConfirmDialog의 포커스 트랩 (focus trap) 미구현

구현한 a11y: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`/`describedby` +
오픈 시 확인 버튼 초기 포커스 + ESC 취소.

**누락**: Tab 키를 다이얼로그 **안에 가두는** 트랩. 현재는 Tab이 배경 요소로 새어 나감.

정적 패턴으로 감지하기 어려운(Soft) 영역이라 Hard 규칙엔 못 넣지만, Skill 가이드
`rules/07-a11y.md` 가 "모달은 포커스 트랩" 을 명시하지 않음.

**개선안**: `rules/07-a11y.md` 에 "모달/다이얼로그 패턴" 섹션을 추가하거나,
`<dialog>` 네이티브 요소 사용을 권장 (브라우저가 자동 트랩).

### ⚠️ G4. i18n 키 의미론적 중복 감지 안 됨

`post.list.deleteConfirmTitle` 과 `post.detail.deleteConfirmTitle` 이 동일 텍스트인데
두 키로 분리됨. 하네스는 이걸 잡지 않는다. 20개→200개 스케일에서 drift 가속 예상.

**개선안(아직 실험 밖)**: 메시지 값 중복을 `npm run check:i18n` 류 스크립트로 감지.
의도된 중복은 명시적 `shared.*` 네임스페이스로.

### ⚠️ G5. "dead route" 누락 — `app/page.tsx` 가 Next.js 기본 템플릿 그대로

모든 하네스를 다 통과하지만, 루트 홈 페이지가 **Vercel Deploy Now 템플릿**이다.
실제 프로덕트라면 명백한 결함. 하네스는 "내용의 적절성"은 감지하지 않는다 (의도된 범위 밖).

**함의**: 하네스는 **범주 수준**(a11y 속성이 있다/없다)은 보장하지만 **내용 수준**(이게
진짜 그 앱의 홈인가)은 보장하지 않는다. 이 선은 명시해두는 것이 하네스의 신뢰 조건.

### ⚠️ G6. 디자인 토큰 부재

`ConfirmDialog`는 inline style로 색상·간격을 하드코딩. 기존 `Alert`, `SafeHtml` 도 동일 패턴.
4개 컴포넌트까진 관리 가능하지만 10개+에서 drift 가속 위험.

**개선안(별도 실험 후보)**: CSS 변수 혹은 Tailwind token 으로 최소 SSOT — 색상·spacing 6~8개.

## 정성 요약

이번 세션에서 체감상 **하네스가 가장 크게 기여한 순간**:

1. **EventMap 컴파일 에러 → 자발적 events.ts 갱신** (G2에서 반대로 개선 필요)
2. **ko→en 동시 추가 강제** — 평행성 타입 장치 하나로 20개 키가 drift 없이 붙음
3. **new-component SKILL의 "4종 한 트랜잭션"** — 실험 04/07/08/10 체크리스트를 머릿속에서 다시 짜맞출 필요 X

**AI가 스스로 해결하기 어려웠던 것**:
1. Focus trap 같은 "행동 기반 a11y" — Hard 규칙 밖 (G3)
2. EventMap을 먼저 추가해야 한다는 **순서** 규약 — 문서 보강 필요 (G2)
3. SessionEnd 이전에 누락 피드백 안 옴 (G1)

## 결정된 개선 액션 (다음 세션 후보)

1. **SKILL.md 에 EventMap 갱신 체크리스트 추가** — G2 대응 (저비용/고효과)
2. **rules/07-a11y.md 에 모달/다이얼로그 패턴 추가** — G3 대응
3. **새 실험 17 후보** — "Dialog focus trap 정책" 또는 "디자인 토큰 SSOT" 중 택 1

## pr:gate 최종 실행 결과

```
lint           ✓
typecheck      ✓
test:run       11 files / 83 passed
audit:components  ✓ (4 components, all have stories + tests, strict mode)
check:rules    ✓ (CLAUDE.md in sync with SSOT)
test:guard     ✓ 17/17
```
