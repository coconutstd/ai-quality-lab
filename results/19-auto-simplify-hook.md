# 실험 19 — Stop hook 으로 simplify 스킬 자동 트리거

## 문제의식

실험 18 의 리뷰 계층 지도는 4 경로를 정의했지만 **3 경로만 시스템화** 돼 있었다:

| 경로 | 시스템화 상태 (실험 18 종료 시점) |
|---|---|
| CI CodeRabbit | `.github/workflows/pr-gate.yml :: review` ✓ |
| `npm run pr:review` | `package.json` 스크립트 ✓ |
| `npm run review:local` | `.claude/scripts/review-local.mjs` ✓ |
| 세션 내 서브에이전트 | **AI 자발적 호출** — 세션마다 잊고 넘어감 ✗ |

실험 18 본인이 Known Gap 으로 명시 ("세션 내 AI — 세션마다 AI 가 '잊고 넘어감'"). 4번째 경로가 시스템화되지 않은 상태로 남아 있었다.

## 해결 가설

Stop hook = Claude 턴 종료 시점에 발화 (SessionEnd 가 아니라). 매 턴마다 코드 파일이 변경됐는지 감지하고, 아직 simplify 가 돌지 않았다면 `decision:"block"` 을 출력해 Claude 가 stop 하지 못하게 하고 simplify 스킬 호출을 강제한다.

서브에이전트 리뷰 전용 스킬을 새로 만들지 않고 기존 `simplify` 스킬을 입력으로 재사용 — "review + fix" 파이프라인이 이미 스킬 안에 있으므로 SSOT 가 하나로 수렴.

## 구현

`.claude/hooks/auto-simplify.mjs` (158 lines) — settings.json 의 `Stop` 이벤트에 등록.

### Gate 설계 (우선순위 순)

1. `stop_hook_active === true` → 통과 (block 이후 재호출 무한루프 방지)
2. `LAB_SKIP_REVIEW=1` 환경변수 → 통과 (opt-out)
3. 비-git 레포 → 통과
4. `HEAD` 대비 미커밋 코드 변경 없음 → 통과
5. 변경분 지문이 마커(`.claude/cache/simplified-<hash>`)와 일치 → 통과
6. 위 모두 걸리지 않으면 `decision:"block"` + reason (파일 목록 + simplify 호출 지시)

### 성능 고려

- `computeFingerprint`: 파일 `size+mtime` 을 먼저 해시, ≤256KB 일 때만 내용까지 해시. 대용량 / 바이너리 보호.
- `pruneStaleMarkers`: `.last-prune` sentinel 파일로 일 1회만 실행. 턴당 O(n) scan 회피.
- 전체 오버헤드: 현재 코드베이스 기준 < 20ms (14 파일 × 116KB 해시).

### SubagentStop 등록은 제거

초기 설계에서 `SubagentStop` 이벤트에도 등록했으나, 핸들러가 즉시 passthrough 하므로 dead config. 제거 후 동작 동일 확인.

## 첫 실측 결과

오늘 세션 — Editorial Engineering Lab 디자인 도입(실험 20) 직후 hook 이 첫 발화.

**simplify 스킬 3 병렬 에이전트(reuse / quality / efficiency) 실행 → 20+ findings** 중 진짜 가치 있는 것만 선별 적용:

| 적용 | 결과 |
|---|---|
| `.inline-error` 유틸 승격 | 중복 JSX 10곳 → 1개 클래스 |
| `.page-container` 유틸 승격 | 중복 `mx-auto max-w-6xl px-6 md:px-10` 11곳 제거 |
| `.meta-line` / `.meta-line-sm` 유틸 승격 | 중복 타이포 패턴 13곳 제거 |
| `.btn-link-danger` / `.input-display` modifier | `!important` 누수 4건 제거 |
| Plex Sans weight `'300'` 제거 | 미사용 폰트 다운로드 제거 |
| `rgba(11,11,11,0.45)` → `var(--overlay)` | stringly-typed 토큰화 |
| hook 자체 `pruneStaleMarkers` sentinel gate | O(n) → 일 1회 |
| hook 자체 `computeFingerprint` size cap | 대용량 잠재 위험 차단 |

**Skip 한 findings (의도적)**: InlineError/PageToolbar 컴포넌트 신설(audit:components 에 story+test 의무 → 과잉), `sh()` 교차 공유(2곳뿐), `padStart` 유틸(4곳뿐), ConfirmDialog data-variant(동작 OK, cosmetic), `background-attachment: fixed` 모바일 잭(측정 전 추측).

**회귀**: pr:gate 83/83 tests + 17/17 guard specs green. 무회귀로 마무리.

## 정량 요약

| 지표 | 값 |
|---|---|
| 신규 hook 스크립트 | `.claude/hooks/auto-simplify.mjs` (1개) |
| 신규 등록 이벤트 | `Stop` |
| 시스템화된 리뷰 경로 | 3 → 4 (4번째가 AI 재량에서 hook 강제로 승격) |
| 첫 실측 find → fix | 20+ findings 중 9건 적용, 7건 skip |
| hook 오버헤드 | < 20ms / 턴 (14 파일 기준) |
| 테스트 스모크 | 6/6 (SubagentStop / opt-out / stop_hook_active / block 생성 / 마커 dedup / hook 재호출) |

## 의도된 한계 — 다음 실험 후보

### 마커 타이밍 취약점

현재 마커는 block 발동 직전(= simplify 실제 실행 전)에 기록된다. Claude 가 simplify 에 진입하지 않고 사용자가 종료하면 마커만 남고 리뷰는 건너뛴다. 해결은 `pending-<hash>` 로 기록 → simplify 완료 시 스킬이 `simplified-<hash>` 로 rename. 스킬측 협조 필요.

### pr:gate 와 분리된 계층

이 hook 은 **Claude Code 세션 내부에서만** 작동한다. CI 머지 / pre-push / 다른 AI 도구에선 여전히 3 경로(CodeRabbit CI / pr:review / review:local)만 방어선. 의도된 경계 — pr:gate 5초 정책 (실험 14) 유지.

### 강제 vs 피로

매 턴마다 simplify 를 돌리면 30~60초 추가. 마커 dedup 으로 완화되지만, 한 세션에서 여러 영역을 연달아 건드리면 여러 번 block 될 수 있다. 현재는 `LAB_SKIP_REVIEW=1` 탈출구만 제공 — 장기적으로는 파일 수 / 변경 크기에 따른 적응형 트리거(예: "3 파일 이상 변경" 문턱) 검토.

## 결정된 다음 단계

- 이 실험 자체가 실험 20(디자인 레이어)의 simplify 실측을 이끌어냈으므로, 후속 세션에서 auto-simplify 가 "정말 매번" 발동하는지 관찰.
- 반복되는 false-positive 블록이 누적되면 적응형 문턱으로 조정.
