# 실험 17 — 통합/E2E 계층 도입

## 트리거

사용자가 `npm run dev` 로 직접 `/posts` 진입 → **404 "서버 오류: 404"**.
단위 테스트 83개는 **전부 green** 이었음. 즉 *빛 좋은 개살구*.

원인 체인:
1. `lib/http.ts` 의 axios baseURL = `/api`
2. `app/api/posts/route.ts` 같은 라우트 핸들러가 **하나도 존재하지 않음**
3. 모든 단위 테스트는 `vi.mock('../http')` 로 http를 통째로 가짜로 돌림 → 라우트 부재 감지 불가
4. 실험 12~15의 어떤 하네스도 "앱이 실제로 끝까지 부팅돼서 한 번이라도 끝까지 흐르는가" 를 검증하지 않음

실험 16의 G5("dead route / 내용 수준 미감지") 의 심화판.

## 도입한 계층

### A. Dev용 인메모리 mock API (`app/api/`)

```
app/api/
├── _store.ts                   # globalThis 백업 인메모리 스토어 (HMR 안전)
├── posts/
│   ├── route.ts                # GET list, POST create
│   └── [id]/
│       ├── route.ts            # GET one, PUT update, DELETE
│       └── comments/
│           └── route.ts        # GET list, POST create
├── auth/login/route.ts         # mock 로그인 (검증만, 실제 인증 없음)
└── test-reset/route.ts         # E2E 전용 reset. prod 빌드에선 404 반환
```

zod 스키마(`CreatePostInputSchema`, `UpdatePostInputSchema`, `CreateCommentInputSchema`, `LoginInputSchema`) 재사용으로 클라이언트/서버 검증 일원화.

### B. Playwright E2E (`e2e/`, `playwright.config.ts`)

- `@playwright/test` + chromium only (CI 속도 우선)
- `webServer: PORT=3100 npm run dev` 로 실제 Next.js dev 서버 기동
- `reuseExistingServer: !process.env.CI` — 로컬 반복 실행 빠르게
- `fullyParallel: false, workers: 1` — 인메모리 store 간섭 방지
- `timeout: 60_000` — Next dev의 on-demand 컴파일 여유
- `beforeEach` 마다 `POST /api/test-reset` 로 시드 상태 복원

### C. 게이트 분리 — pr:gate vs ci:e2e

| 단계 | 구성 | 속도 | 트리거 |
|---|---|---|---|
| `pr:gate` | lint / typecheck / test:run / audit / check:rules / test:guard | ~5s | pre-push + CI gate job |
| `ci:e2e` | Playwright 5 테스트 + dev server | ~15s (cold) / ~7s (warm) | CI e2e job (gate 성공 후) |
| `pr:review` | CodeRabbit | 변동 | CI review job (PR 한정) |

E2E는 pre-push에 **넣지 않음**. 이유: 로컬 dev 서버 부팅 오버헤드 + 사용자 `npm run dev` 점유 포트 충돌 가능성. CI의 `needs: gate` 직렬로 충분.

## E2E 스펙 구성 (`e2e/posts.spec.ts`)

5개 플로우, 모두 녹색:

1. `/posts` 진입 시 시드 3건 렌더 — **이번 실험의 트리거 결함**을 정확히 재현/감지
2. 목록 → 상세 진입, SafeHtml 본문 + 댓글 로드
3. 상세 → 편집 → 저장 → 변경이 목록에도 반영
4. 삭제 버튼 → `role="dialog"` + `aria-modal` + 초기 포커스 검증 → 확인 → 리스트에서 제거
5. 삭제 다이얼로그에서 ESC → 취소 → 포스트 유지

## 실제로 잡힌 결함들 (E2E가 만든 피드백)

### E1. Next.js App Router의 언더스코어 폴더 라우팅 배제

처음에 reset 엔드포인트를 `app/api/_reset/route.ts` 로 만듦 → **라우트로 등록되지 않음**.
Next.js는 `_` 접두어 폴더를 "private folder" 로 취급해 라우팅에서 제외한다는 규약.

증거: 테스트 5의 스냅샷에서 이전 테스트의 편집이 리셋되지 않고 남아있었음 ("E2E 수정된 제목 …").
단위 테스트·typecheck·lint 모두 이 버그를 감지하지 못했다. 수정: `_reset` → `test-reset`.

**이 버그는 정확히 E2E가 아니면 못 잡는 부류다.**

### E2. Next.js 16 cross-origin dev resource 차단

Playwright가 `127.0.0.1:3100` 으로 접근 시 Next dev가 HMR/webpack 리소스를 cross-origin으로 보고 경고.
수정: `next.config.ts` 에 `allowedDevOrigins: ['127.0.0.1', 'localhost']`, baseURL 을 `localhost` 로 정렬.

### E3. 첫 라우트 방문의 on-demand 컴파일이 Playwright 기본 30s timeout을 초과

수정: `timeout: 60_000`, `expect.timeout: 10_000` 로 완화.

### E4. 인메모리 store 병렬 간섭

초기엔 `fullyParallel: true`. 5 worker 가 같은 프로세스의 store에 난입 → 플레이키.
수정: `workers: 1`. 속도 대신 확정성.

## 정량 변화

| 지표 | 이전 | 이후 |
|---|---|---|
| 단위 테스트 | 83 | 83 (변동 없음) |
| E2E 테스트 | 0 | **5** (5/5 pass) |
| 백엔드 라우트 | 0 | **8** (posts CRUD 5 + comments 2 + auth 1) |
| 실제 dev 앱 `/posts` | **404** | **200 + 3건 렌더** |
| pr:gate 실행 시간 | ~5s | ~5s (변동 없음) |
| ci:e2e 실행 시간 | — | 로컬 ~7s warm / CI ~15s cold |

## 하네스 계층 업데이트

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [기존] 코드 작성 시 (항상 계층)              ← 실험 12                   │
│ [기존] 컴포넌트 생성 시                      ← 실험 13                   │
│ [기존] 커밋/푸시 직전 (PR 계층 — 단위)       ← 실험 14                   │
│ [기존] 다른 프로젝트로 이식                  ← 실험 15                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ pass
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ [신규] CI 통합/E2E 계층                      ← 실험 17                   │
│   .github/workflows/pr-gate.yml :: job e2e                              │
│   playwright.config.ts + e2e/posts.spec.ts                              │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ 실제 Next.js dev 서버 + 실제 브라우저 + 실제 라우트/핸들러.       │  │
│   │ unit mock이 감추는 결함(라우트 부재, cross-origin, 포커스 이동)  │  │
│   │ 을 감지. gate job 성공 후에만 돌아 단위 피드백 속도 보존.         │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 얻은 교훈 / 의도된 한계

- **단위 테스트가 "내부 mock을 완전히 설정"할수록 이 계층의 필요는 커진다.** 83개 단위 테스트가 전부 green인데 앱이 부팅 즉시 404라는 대조가 그 증거.
- **E2E는 느리므로 pre-push에는 넣지 않는다.** 실험 14의 5초 게이트 정책을 유지. 이식성(실험 15) 관점에서도 starter에 E2E는 기본 포함하지 않는 편이 안전.
- **인메모리 mock store는 dev 전용.** prod 빌드에서 `process.env.NODE_ENV === 'production'` 가드로 reset 엔드포인트만 404. 실제 백엔드 결합 시점에 `app/api/*` 를 프록시로 교체 예정.
- **Playwright의 `request` fixture를 쓰면 brower 없이도 API-only 통합 테스트**를 유닛 수준에 가까운 속도로 돌릴 수 있음. 필요해지면 별도 파일로 분리.

## 다음 실험 후보

1. **실험 18 (후보)** — `starter/` 번들에 E2E 하네스 이식 시뮬레이션. 이식 후에도 5/5 green이 나오는가.
2. **실험 19 (후보)** — 실험 16의 G6(디자인 토큰 부재) 또는 G3(dialog focus trap). 남은 Soft 영역을 하나씩 Hard 쪽으로 끌어오기.
3. **실험 20 (후보)** — 실제 백엔드 교체 시 mock API 제거/교체가 한 커밋 안에 끝나는지 — 이식성 검증.
