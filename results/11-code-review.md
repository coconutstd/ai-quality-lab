# 실험 11: AI Pre-Review (CodeRabbit) 결과

## 측정 일시
2026-04-23

## 환경
- CodeRabbit CLI v0.4.2 (다윈 arm64)
- Claude Code 플러그인: `coderabbit:review` 스킬 사용
- 실행 명령: `coderabbit review --agent -t all`

## 베이스라인 (실험 10 직후)

| 항목 | 수치 |
|---|---|
| AI 사전 리뷰 | 0회 |
| 단위 테스트 | 69개 |

## 적용 후

| 항목 | 수치 |
|---|---|
| CR finding 총수 | **40개** |
| 진짜 가치 있는 finding | **3개** (전부 적용) |
| 거짓 양성 | **2개** (Zod v4 API 모름) |
| 범위 밖 (Storybook 빌드 산출물) | **10+개** (`.gitignore` 추가로 차단) |
| 자기 참조 / 도메인 잡음 | 나머지 |
| 신규 회귀 방지 테스트 | **+2개** (i18n replaceAll, sanitize tabnapping) |
| 단위 테스트 | **71개** |
| TypeScript strict / ESLint | 통과 |

## CR Severity 분포

| Severity | Count |
|---|---|
| critical | 4 |
| major | 23 |
| minor | 13 |

## 진짜 가치 있는 Finding (3개) — 모두 적용

### 1. `lib/i18n/index.ts` — `replace` 단일 치환 버그 [major]
**문제**: `acc.replace('{${k}}', String(v))` — 같은 placeholder가 메시지에 두 번 나오면 첫 번째만 치환됨.
**수정**: `replaceAll`로 변경.
**회귀 방지**: `i18n.test.ts`에 케이스 추가.
**의의**: 현재 카탈로그엔 동일 placeholder 중복 케이스가 없어 즉시 발현 안 했지만, 미래에 추가될 때 조용히 깨질 버그였음. **CR가 아니었으면 못 잡았을 high-leverage finding**.

### 2. `app/login/page.tsx` — analytics에 raw email PII 전송 [major]
**문제**: `track('auth.login.attempt', { email: data.email })` — 사용자 이메일 원본을 어댑터(Sentry/PostHog 등)로 흘림.
**수정**:
- `EventMap['auth.login.attempt']` 타입을 `{ email: string }` → `{ emailDomain: string }`로 변경
- 호출부에서 도메인만 추출: `data.email.split('@')[1] ?? 'unknown'`
**의의**: GDPR/개인정보보호법 영향 가능한 **실제 컴플라이언스 이슈**. 09에서 트래킹을 일괄 propagate할 때 놓친 부분 — 사람 리뷰어가 걸러줘야 했을 종류의 결함.

### 3. `lib/sanitize.ts` — tabnapping 위험 [major]
**문제**: `ALLOWED_ATTR`에 `target` 허용 → `<a target="_blank">`가 통과되면 `window.opener` 노출.
**수정**: DOMPurify의 `afterSanitizeAttributes` hook으로 `target` 가진 모든 anchor에 `rel="noopener noreferrer"` 자동 부여.
**회귀 방지**: `sanitize.test.ts`에 케이스 추가.
**의의**: 03/05 실험에서 SafeHtml 봉인 + 화이트리스트까지 했지만 **target_blank tabnapping은 못 본 angle**. 보안 리뷰의 진가가 드러난 케이스.

## 거짓 양성 (2개)

### `lib/schemas.ts:25, 37` — `z.email()`이 "잘못된 Zod API"라고 주장 [critical]
**문제**: CR이 `z.string().email()`로 바꾸라 권유.
**실제**: **Zod v4는 `z.email()` 톱레벨 함수가 canonical**. CR의 학습 데이터가 v3 시점이라 발생한 false positive.
**검증**: 실험 03 진행 시 context7 docs로 명시적 확인 + tsc/lint/runtime 모두 통과.
**대응**: 변경 없음. 이 결과 문서에 사유 기록.

→ 04 실험 결과 문서에서 이미 같은 함정을 잡은 적이 있음. **CR도 같은 함정에 빠짐** — AI 코드 리뷰어도 학습 데이터 cutoff에서 자유롭지 않다는 사실을 직접 확인.

## 범위 밖 (Storybook 빌드 산출물)

CR이 `storybook-static/**` 의 minified 번들 파일들에 대해 다수의 finding 생성:
- `assets/CommentList.stories-*.js` — 빌드 산출물 추적 금지 권유 ✅ 정확한 지적
- `sb-manager/globals.js` — placeholder 매핑 버그 — **Storybook 자체 코드**, 우리가 못 고침

**대응**: `.gitignore`에 `storybook-static/` 추가. 빌드 산출물은 CI에서만 생성.

→ CR을 돌리기 **전에** `.gitignore`를 정비해야 잡음이 줄어든다는 운영 교훈.

## 자기 참조 / 도메인 잡음

CR이 `rules/` 안의 검증 grep 명령에 대해 "ESLint plugin으로 바꾸라"든가 `results/` 문서의 "이건 기술 부채로 표시하라"는 식의 finding 생성. 일부는 합리적이지만 lab의 의도(점진적 실험 기록)와 어긋남. 일괄 무시.

## 규칙 체크리스트 결과

### 실행
- [x] `coderabbit review --agent -t all` 실행
- [x] 큰 변경 묶음(실험 02~10) 직후 실행
- [x] 빌드/테스트 통과 상태에서 실행 (CR가 lint 이슈를 안 올림)

### 처리 (분류 → 결정)
- [x] 진짜 가치 있는 finding 3개 모두 수정 + 테스트
- [x] 거짓 양성 2개 사유 명시
- [x] Storybook 산출물 잡음을 `.gitignore`로 차단

### 회귀 방지
- [x] i18n replaceAll, sanitize rel="noopener" 회귀 테스트 추가
- [x] CR가 잡은 패턴이 향후에도 나오면 lint rule 승격 검토 (eslint-plugin-jsx-a11y, eslint-plugin-security 등)

## 평가

**성공.** 40개 finding 중 **3개의 진짜 가치 있는 발견**이 있었고, 그중 둘은 **사람 리뷰어가 걸러야 할 보안/프라이버시 결함**(PII 누출, tabnapping). 이 둘은 02~10에서 만든 안전망(테스트, 봉인, 트래킹 카탈로그)으로도 못 잡았던 angle.

### 정량 효율 (signal-to-noise)

- **Precision (가치 있는 / 전체)**: 3/40 ≈ 7.5%
- **하지만 가치 있는 것들의 영향도**: 보안 1건 + 프라이버시 1건 + 잠재 버그 1건. **사람 리뷰 1시간 = 충분히 본전**.
- **잡음 처리 비용**: 5분 (분류만)

### CR이 잘 한 것

1. **새 angle 제공** — 우리가 이미 만든 패턴을 그대로 재확인하지 않고, **다른 위험 측면**을 끌어올림 (PII, tabnapping)
2. **지시 사항이 actionable** — 대부분 finding이 "어디를 어떻게 바꿔라"까지 명확
3. **agent 모드의 JSON 구조** — `codegenInstructions` 필드가 자동 적용 가능한 형태

### CR이 못 한 것 / 한계

1. **라이브러리 신버전 모름** — Zod v4 등 cutoff 이후 변화에 약함
2. **빌드 산출물 vs 소스 구분 못 함** — `.gitignore` 정비가 사용자 책임
3. **도메인 의도 모름** — `results/`의 "의도적으로 보존" 같은 메모를 "기술 부채"로 오해
4. **자기 카테고리 폭주** — i18n 키로 만들 가치 없는 storybook 메타데이터 description까지 i18n 권장

### 06~10과의 시너지

- **04 단위 테스트**: CR가 잡은 i18n / sanitize 버그를 **즉시 회귀 테스트로 잠글 수 있는 인프라**가 이미 깔려 있어, fix → test 사이클이 5분 안에 완료
- **05 SafeHtml 봉인**: tabnapping fix가 `lib/sanitize.ts` **한 곳**만 고쳐도 모든 호출부 자동 보호 (단일 출처의 가치)
- **09 타입 안전한 트래킹**: PII fix가 `EventMap` shape 한 곳 변경 + 호출부 한 곳 수정으로 끝남. CR 권유의 적용 비용을 누적 자산이 줄여줌

## 누적 효과 (Baseline → 11)

| 영역 | Baseline | Now |
|---|---|---|
| 단위 테스트 | 0 | **71** |
| Story 케이스 | 0 | **11** |
| 사용자 액션 추적 | 0 | **15** (PII 보호 적용) |
| i18n 키 | 0 | **42** |
| 보안 위험 | 3 | **0** (+ tabnapping 차단) |
| 프라이버시 위험 | (미인식) | **0** (raw email 전송 차단) |
| AI 사전 리뷰 | 없음 | **CR 워크플로우 정착** |

## 의미 (전체 시리즈 마무리 관점)

02~10이 "**규칙을 정착시키고 패턴을 propagate한다**"는 흐름이었다면, 11은 "**그 패턴 안에서도 사람이 놓치는 angle을 AI가 한 번 더 훑는다**"는 안전망의 마지막 층.

특히 **AI 사전 리뷰의 limitation도 솔직히 기록**해두는 게 중요 — 라이브러리 신버전 모름, 도메인 의도 모름. 즉 CR을 100% 신뢰해서 자동 적용하면 안 되고, **사람이 분류하는 단계가 여전히 필요**. AI가 사람을 줄여주는 게 아니라 **사람의 시각을 보완**하는 도구로 자리잡힘.

## 다음 실험 후보

- 12. CI에서 CR 자동 실행 (PR 올리면 GitHub Action으로)
- 12. ESLint 룰 승격 — CR가 잡은 패턴(jsx-a11y, security, no-target-blank-without-rel) 빌드 단계 강제
- 12. CR config 튜닝 — `.coderabbit.yaml`로 `storybook-static/`, `results/` 등 path 무시
