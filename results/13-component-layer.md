# 실험 13: 컴포넌트 계층 자동 적용 결과

## 측정 일시
2026-04-23

## 목표

"컴포넌트 생성 시" 계층(a11y·Storybook·i18n·단위 테스트)을 **하나의 트리거**로 동시 산출한다.
실험 07/08/10/04에서 각 항목은 AI로 잘 되는 것이 증명됐다. 이번엔 "매번 묶여서 나오는가"가 질문.

## 메커니즘 설계 — Skill + Audit

| 층 | 메커니즘 | 역할 | 특성 |
|---|---|---|---|
| **Skill** | `.claude/skills/new-component/SKILL.md` | 컴포넌트 생성 요청 시 AI에게 4종 산출물 계약 제시 | Soft — AI의 스킬 준수에 의존하지만, 규격이 명시적이라 일관성 높음 |
| **Audit** | `.claude/hooks/audit-components.mjs` (+ `SessionEnd` hook) | components/*.tsx 각각의 동반 산출물(`.stories.tsx`, `__tests__/*.test.tsx`) 존재 검증 | Discipline — 누락 감지·경고. `--strict` 플래그로 CI 게이트 승격 가능 |

→ 실험 12가 **Hard 차단**(패턴 매칭으로 금지)이었다면, 13은 **Hard 감사**(존재성 검증) + **Soft 유도**(skill 규격) 조합. 컴포넌트는 "쓰지 말아야 할 것"보다 "함께 만들어야 할 것"이 많아 **positive contract** 쪽이 적합.

## Skill 규격 요약

위치: `.claude/skills/new-component/SKILL.md`

**산출물 계약**:
1. `components/{Name}.tsx`
2. `components/{Name}.stories.tsx` (최소 2개 스토리)
3. `components/__tests__/{Name}.test.tsx` (최소 2개 테스트)
4. `lib/i18n/messages.ts`에 key 추가 (ko + en 동시) — 사용자 대면 텍스트가 있을 때만

**준수 항목** (기존 CommentList/SafeHtml 패턴 고정):
- a11y: `useId()` + `aria-*`, `role="alert"|"status"`, `aria-live`, `aria-busy`
- i18n: 하드코딩 금지, 전부 `t('key')`; placeholder 토큰은 ko/en 동일
- analytics: 사용자 액션 있으면 `track()` + EventMap 업데이트; PII 금지
- 타입: `any` 금지 (실험 12 hook이 이미 Hard 차단)

**완료 게이트**: `tsc --noEmit`, `npm run lint`, `npm run test:run` 모두 통과해야 완료 보고.

## 수용 시험 — Alert 컴포넌트 실측

스킬 규격에 따라 `Alert` 컴포넌트를 한 트랜잭션으로 생성. 프롬프트 없이 스킬 SKILL.md만 읽고 재현.

### 산출물 (4종 + analytics 타입 확장)

| 파일 | 핵심 내용 |
|---|---|
| `components/Alert.tsx` | `role="alert"`, `aria-labelledby`, `aria-describedby`, `useId` 2개, variant 4종(info/success/warning/error), dismissible + `onDismiss`, analytics `alert.dismiss.click` |
| `components/Alert.stories.tsx` | 3개 스토리 (Info / Error / Dismissible — Dismissible은 `useState` render wrapper로 실제 닫기 동작 시연) |
| `components/__tests__/Alert.test.tsx` | 3개 테스트 (aria 와이어링 / dismiss 클릭 + ko 레이블 / title 없을 때 aria-labelledby 생략) |
| `lib/i18n/messages.ts` | `alert.button.dismiss`: `닫기` / `Dismiss` 추가 — ko·en 동시 |
| `lib/analytics/events.ts` | `'alert.dismiss.click'` 이벤트 타입 추가 (`id` + `variant`, PII 없음) |

### 완료 게이트

```
✓ npx tsc --noEmit          (통과, 출력 없음)
✓ npm run lint              (통과)
✓ npm run test:run          10 files, 74 tests passed  (+3 Alert 테스트)
```

실험 10 이후 베이스라인 71개 → 74개. Alert 컴포넌트 하나가 03개의 테스트·03개의 스토리·01쌍(ko/en)의 i18n key·01개의 analytics 이벤트를 **동시에** 가져옴.

## Audit 검증 — 누락 감지 정확성

`.claude/hooks/audit-components.mjs`는 `components/*.tsx` 각각에 동반 산출물 여부를 검사.

### 실제 코드베이스 감사
```
$ node .claude/hooks/audit-components.mjs
✓ 컴포넌트 계층 감사 통과 — 3개 컴포넌트 모두 동반 산출물(story + test) 보유.
```

(SafeHtml / CommentList / Alert — 전부 story + test 있음.)

### 합성 실패 케이스 (격리된 디렉토리)
```
components/Good.tsx           + Good.stories.tsx + __tests__/Good.test.tsx
components/Lonely.tsx         ← story 없음, test 없음
components/HasStoryOnly.tsx   + HasStoryOnly.stories.tsx (test 없음)
```

감사 결과:
```
⚠️  컴포넌트 계층 discipline — 2건 누락
  HasStoryOnly.tsx → missing: __tests__/HasStoryOnly.test.tsx
  Lonely.tsx → missing: Lonely.stories.tsx, __tests__/Lonely.test.tsx
```

`--strict`로 실행 시 exit 1 — CI에서 PR 게이트로 승격 가능.

### 자동 트리거 등록

`.claude/settings.json`:
- `SessionEnd` hook에 `audit-components.mjs` 등록 → 세션 종료 시 자동 감사 메시지.
- `npm` script로 승격 안 함 (이번 범위). CI 전환 시 `"audit:components": "node .claude/hooks/audit-components.mjs --strict"`로 확장.

## 실측 표

| # | 기준 | 기대 | 실측 |
|---|---|---|---|
| 1 | Skill 한 번으로 4종 산출 | 4개 파일 + 필요 시 analytics 타입 | ✅ Alert.tsx/stories/test + i18n ko·en + EventMap |
| 2 | tsc strict 통과 | 에러 0 | ✅ 출력 없음 |
| 3 | lint 통과 | 에러 0 | ✅ |
| 4 | 단위 테스트 통과 | 71 → 74 | ✅ 74/74 |
| 5 | a11y — role=alert + aria wiring | 있음 | ✅ `aria-labelledby`/`aria-describedby` 모두 유효 id 참조 |
| 6 | i18n ko/en 평행성 | TS가 강제 | ✅ `Record<keyof typeof ko, string>` shape 유지 |
| 7 | analytics PII 안전 | 원본 식별자 없음 | ✅ `id`(사용자 지정 문자열) + `variant` (열거형), 사용자 식별 불가 |
| 8 | Audit — 정상 케이스 통과 | exit 0 | ✅ |
| 9 | Audit — 누락 감지 | exit 1 (strict) + 누락 파일명 | ✅ 2건 정확히 리포트 |
| 10 | Skill이 hook과 충돌 없음 | 실험 12 hook이 방해 안 함 | ✅ Alert.tsx에 `any` 없고 보안 위반 없음 |

## 경계 정리 — 어디까지 자동화했고 무엇이 남았나

### 자동화된 것 (실험 13 범위)
- 컴포넌트 생성 **요청 → 4종 산출 계약** (Skill)
- 산출 **완료 게이트** (tsc/lint/test) — Skill이 선언, AI가 수행
- **동반 산출물 존재성 검증** (Audit, SessionEnd 자동)

### 자동화 안 된 것 (의도적 한계)
- **a11y 정적 검증**: `role`/`aria-*` 문자열 존재는 스킬이 유도하지만, **실제로 올바른 id를 참조하는지**는 스킬 규격 + 테스트 작성자의 의도에 의존. `eslint-plugin-jsx-a11y`를 ESLint에 추가하면 이 부분을 Hard로 승격 가능 (실험 14 후보).
- **Story 시각 회귀**: Storybook 케이스가 **렌더되는지만** 테스트(build-storybook)로 보호 가능. 픽셀 수준 회귀는 별도(Chromatic 등).
- **i18n key 실사용 검증**: `t('alert.button.dismiss')` 가 실제로 카탈로그에 있는지는 TS가 강제. 반대로 **카탈로그에만 있고 사용처 없는 dead key**는 미검증. 실험 14 후보.

### Hard가 아닌 이유 — 컴포넌트 계층의 특성
- 실험 12의 Hard는 "금지 패턴이 포함되면 차단". 정적 패턴만 있으면 충분.
- 실험 13은 "동반 산출물이 **함께** 있어야 함". 이건 **여러 파일의 조합 상태**를 봐야 하는 일.
- PreToolUse 시점에선 아직 동반 파일이 없을 수 있어 false positive 확정. 그래서 **SessionEnd 감사**로 분리했고, Skill이 "같은 응답 턴 안에 함께 써라"로 유도.

## 누적 효과 (Baseline → 13)

| 영역 | Baseline | 실험 11 후 | **실험 13 후** |
|---|---|---|---|
| 단위 테스트 | 0 | 71 | **74** |
| Story 케이스 | 0 | 11 | **14** |
| i18n 키 | 0 | 42 | **43** |
| EventMap 이벤트 | 0 | 15 | **16** (PII 안전) |
| 재사용 컴포넌트 | 0 | 2 (SafeHtml, CommentList) | **3** (+ Alert) |
| 스캐폴드 자동화 | 없음 | 없음 | **new-component skill** |
| Discipline 게이트 | 없음 | PreToolUse hook (12) | **+ SessionEnd audit** |

## 평가

**성공.** 컴포넌트 1개 생성 요청으로부터 4종(+analytics 타입 확장) 산출물이 한 번에 나왔고, tsc/lint/test가 전부 녹색. Audit 스크립트는 정상 케이스·누락 케이스 모두 정확히 분류.

### 성공한 것
- 스킬이 기존 패턴을 충실히 반영해, AI가 재현한 Alert가 **CommentList/SafeHtml 스타일과 일관**된 산출물 구조를 가짐
- TS 타입 시스템(`Record<keyof typeof ko, string>`, `EventMap`)이 i18n·analytics **평행성을 컴파일 시점에 강제** — 이건 실험 08/09에서 깔아둔 기반이 본 실험의 soft layer를 단단하게 만든 사례
- Audit이 false positive 0건, 합성 실패 케이스에서 누락 파일을 정확히 가리킴

### 남은 한계
- Skill은 **AI가 SKILL.md를 실제로 참조하는지**에 의존. 이번 세션에선 명시적으로 적용했지만, 다른 세션·다른 모델에서 자동으로 발동하는지는 실측 필요 (실험 12의 "Soft 층 재현성" 리스크와 동일 구조).
- Audit은 **존재성만** 검사. 내용 품질(스토리가 의미 있는 케이스인지, 테스트가 a11y를 실제로 검증하는지)은 코드 리뷰(실험 11 CR) 몫.
- SessionEnd hook은 **회고적 경고**. 세션 중간에 실시간 block이 아니라서 discipline이 느슨할 수 있음.

### 비용
- 구현 시간: 약 45분 (스킬 문서 + Alert 수용 시험 + audit 스크립트 + 검증)
- Alert 1개에 대해 **74 - 71 = 3개 테스트 / +3 스토리 / +1 i18n 쌍 / +1 EventMap 항목**이 따라붙은 건 **1개 파일 대비 5배의 산출물** — 이것이 "컴포넌트 계층 자동화"의 정량 가치

## 다음 실험 후보

- **실험 14 — PR 계층**: pre-commit/pre-push hook으로 `tsc + test:run + audit-components --strict + CodeRabbit`을 자동 실행. 실험 12의 Hard, 13의 Skill·Audit을 통합 게이트로 묶는 단계.
- **실험 13 확장 — a11y 정적 검증**: `eslint-plugin-jsx-a11y` 추가로 aria-* 오용을 Hard로 승격.
- **실험 13 확장 — dead i18n key 감지**: `lib/i18n/messages.ts` 키 중 코드베이스에서 `t('key')`로 참조 안 된 것을 audit에 추가.
