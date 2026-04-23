# 실험 18 — 리뷰 계층 명시화

## 트리거

실험 17 종료 직후 사용자: "**근데 코드 리뷰는 하고 있니?**"

솔직한 답: 하고 있지 않았다. 이번 세션에서 코드를 14개 파일/263+ 추가하도록 작성했는데
어떤 리뷰도 자동으로 돌지 않았다. 사유를 파보니 시스템적 공백이었다.

## 현재 리뷰 상태 진단 — 왜 암묵지였는가

| 수단 | 트리거 | 비용 | 현재 동작 상태 |
|---|---|---|---|
| `.github/workflows/pr-gate.yml::review` | PR 오픈 시 자동 | CodeRabbit API | PR 없으면 **안 돎** |
| `npm run pr:review` | 수동 | CodeRabbit API | 사용자/AI가 **명시 호출해야 돎** |
| `/coderabbit:review`, `/security-review` Skill | 사용자 명시 호출 | 과금/무료 혼재 | 기억 의존 |
| `feature-dev:code-reviewer` 서브에이전트 | AI가 명시 호출 | 무료 | 세션마다 AI가 "잊고 넘어감" |

즉 **리뷰가 기본값이 아니고**, PR 이라는 외부 트리거에 의존하거나, 인간/AI의 자발적
기억에 의존한다. 실험 12~14가 "항상 계층 / 컴포넌트 계층 / PR 계층" 을 **기계적
기본값** 으로 끌어내린 것과 대비된다.

특히 실험 17에서 적발된 결함 중 2건(login route 인증 우회, test-reset NODE_ENV 가드
허점)은 **정적 패턴으로는 잡을 수 없는 문맥 판단**이다. 리뷰 레이어가 기본값에 있었어야
pr:gate 통과 전에 차단되었을 사안.

## 도입한 경로 — 리뷰가 "기본값에 근접"하게

### (1) 기존 PR / CI — 유지

`.github/workflows/pr-gate.yml::review` 에서 CodeRabbit 실행. PR 한정, 시크릿
(`CODERABBIT_API_KEY`) 옵트인. **PR이 최종 방어선**이라는 특성 유지.

### (2) 기존 로컬 심층 — 유지

`npm run pr:review` — CodeRabbit 로컬 실행. 과금 있음. 사용자가 브랜치를 최종
정리한 뒤 직접 돌리는 용도.

### (3) **신규 — 로컬 무가격: `npm run review:local`**

`.claude/scripts/review-local.mjs` 가 현 브랜치 변경분을 리뷰 프롬프트 패키지로
stdout 에 덤프한다:

- `git diff $BASE...HEAD` (기본 base 자동 탐색: origin/main → main → HEAD~1)
- `git log --oneline`, `git diff --stat`, `--name-status`
- `CLAUDE.md` + `AGENTS.md` 요약
- "confidence filtering / severity 분류 / 500단어 cap" 리뷰 인스트럭션 포함

용도:
- **Claude Code 서브에이전트 prompt** 로 그대로 붙여넣기 → 무료 리뷰
- **ChatGPT/Claude 웹/Gemini/GitHub Copilot Chat** 등 임의 LLM 인터페이스
- 인간 리뷰어용 배경 자료 (이메일/슬랙 공유)

과금 0, 인터넷 필요 없음(LLM 호출 분만 외부), 어떤 모델이든 호환.

### (4) 세션 내 AI — 명시화

이번 실험에서 실제로 사용한 `feature-dev:code-reviewer` 서브에이전트를 README 계층
지도의 공식 경로로 승격. AI가 세션 말미에 "리뷰 했나?" 물음을 자발적으로 떠올리는
근거 문서가 된다.

## 리뷰 계층 지도 갱신

README 의 "계층별 자동 방어 지도" 에 다음 박스를 `실험 17 → 실험 15` 사이에 삽입:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 리뷰 계층 (4 트리거 경로)                                ← 실험 18      │
│   1) PR / CI       CodeRabbit (시크릿 + 과금, PR 한정)                  │
│   2) 로컬 심층     npm run pr:review (과금, 현 브랜치)                  │
│   3) 로컬 무가격   npm run review:local → stdout 프롬프트 패키지        │
│   4) 세션 내 AI    서브에이전트 feature-dev:code-reviewer               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 이 실험의 증거 — 실제로 잡힌 것

실험 17 종료 직전 `feature-dev:code-reviewer` 한 번 실행(42초, 무료)으로 적발:

- **Critical**: `app/api/test-reset/route.ts` 의 `NODE_ENV !== 'production'` 가드는 Vercel
  preview / staging 등 production-like 환경에서 허점. `ENABLE_TEST_RESET=true`
  명시 opt-in 으로 교체.
- **High**: `app/api/auth/login/route.ts` 가 가드 없이 노출되어 어떤 입력이든 세션
  쿠키를 내주던 취약점. `MOCK_AUTH=true` 명시 opt-in 으로 교체.
- **Medium**: `app/posts/[id]/edit/page.tsx` 의 RHF `values` 옵션이 리페치 시 사용자
  입력을 덮어씀. `staleTime: Infinity` + `useRef` 1회 `reset` 패턴으로 교체.
- **Medium**: `components/ConfirmDialog.tsx` ESC 핸들러의 오버레이 내부 포커스 의존.
  주석으로 명시, starter 승격 시 document-level 이관 TODO.

이 4건은 단위 테스트 83개, pr:gate 6/6, E2E 5/5 **전부 통과**한 상태에서 숨어
있었다. 즉 **리뷰 레이어가 없었다면 merge 로 들어갔을** 코드.

## 정량 요약

| 지표 | 값 |
|---|---|
| 신규 스크립트 | `.claude/scripts/review-local.mjs` (1개) |
| 신규 npm 스크립트 | `npm run review:local` |
| 리뷰 경로 개수 | 암묵 1개(CI만) → 명시 4개 |
| 실제 리뷰 적발 결함 | Critical 1 + High 1 + Medium 2 (4건) |
| 추가 소요 비용 | 0원 (subagent 무료) |
| 추가 소요 시간 | 1회 리뷰 ~42초 |

## 의도된 한계 — 다음 실험 후보

### 리뷰 **강제**는 하지 않음 (의도)

`pre-push` 훅에 review:local 을 넣지 않았다. 이유:
- 리뷰 결과 해석은 인간/LLM 판단이므로 게이트에 넣기 부적절
- pr:gate ~5초 성질 유지 정책 (실험 14)

대신 **리마인더** 층을 둘 수는 있다. 예: SessionEnd hook 에서 "이번 세션에 코드
변경이 있었는데 review:local / 서브에이전트 리뷰를 돌렸나?" 같은 알림. 이건 **실험 19**
후보.

### `review:local` 산출물의 품질 편차

프롬프트 패키지는 변경분 + context 를 얼마나 잘 싸느냐가 핵심이다. 현재는 단순
diff + CLAUDE.md/AGENTS.md 임베드. 추후 개선 후보:
- 브랜치의 커밋별 분할(PR 내 논리적 chunk 제안)
- 파일별 "이 파일은 어떤 계층/모듈인가" 라벨
- 테스트 파일 / 라우트 핸들러 / 컴포넌트 구분해 리뷰어 프롬프트 커스터마이즈

### CodeRabbit vs subagent 비교 미측정

두 경로의 **결함 적발 overlap** 을 측정하지 않음. 실험 19/20 후보: 같은 diff 에
두 경로를 돌려 "둘 다 잡음" / "A만" / "B만" 버킷화.

## 결정된 다음 단계

1. 현 브랜치(`exp/16-17-integration-review`) 에서 이 변경 커밋.
2. PR 열 때 CI `review` job 이 실제로 돌고 결과가 `review:local` 출력과 어떻게
   다른지 비교 (실험 19 씨앗).
