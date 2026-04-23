# 실험 22: 성능 계층 (번들 게이트 + Lighthouse 리포팅)

## 측정 일시
2026-04-23

## 목표

코드 품질(타입/보안/테스트/E2E) 계층은 잡지만, 사용자 체감 속도는 완전히 무감각한 공백을 메운다.
두 가지 측정 레이어 조합으로 성능 회귀를 조기에 감지한다:

- **빌드 타임 번들 게이트** (hard, CI fail): gzip 청크 크기 초과 시 PR merge 블록
- **런타임 Lighthouse 리포팅** (soft, artifact만): push:main 시 3 페이지 점수 측정 후 JSON/HTML 저장

## 도입한 계층 / 설계 / 구현

### 스크립트

| 파일 | 역할 |
|---|---|
| `.claude/scripts/bundle-gate.mjs` | `build-manifest.json` 기반 청크 분류 + gzip 크기 게이트 |
| `.claude/scripts/perf-report.mjs` | `next start` + Lighthouse 3 페이지 측정 + JSON/HTML 저장 |

### npm scripts

```bash
npm run bundle:check   # gate 모드 (exit 1 시 CI 블록)
npm run bundle:report  # report 모드 (항상 exit 0, 로컬 분석)
npm run perf:report    # Lighthouse 측정 (항상 exit 0, ~3분)
```

### 청크 분류 방식

Turbopack 은 vendor/pages 구분 없이 공유 청크를 생성하므로 파일명 패턴 분류가 불가능하다.
`build-manifest.json` 의 `rootMainFiles` + `polyfillFiles` → **framework**, 나머지 → **app** 2-카테고리 분류.

### Threshold (config.mjs `BUNDLE_LIMITS`, gzip bytes)

| 카테고리 | 실측 | 한도 | 헤드룸 |
|---|---|---|---|
| framework | 167.7 KB | 200 KB | +19% |
| app | 320.4 KB | 400 KB | +25% |
| 전체 | 488.0 KB | 580 KB | +19% |
| 단일 청크 | 85.5 KB | 110 KB | +29% |

### CI 통합 (`pr-gate.yml`)

```
PR 이벤트:   gate(5s) + bundle-gate(~90s) 병렬 → e2e
push:main:  gate + bundle-gate → lighthouse(~3분)
```

- `bundle-gate` job: PR + push:main 모두 실행 (gate job과 병렬)
- `lighthouse` job: push:main 한정, artifact 14일 보관

### 신규 devDependency

```json
"lighthouse": "^13.1.0"
```

`chrome-launcher` 는 lighthouse 에 번들, CI 에서는 `browser-actions/setup-chrome@v1` 으로 Chrome 공급.

## 실측 결과

### 번들 게이트

```
번들 게이트 분석 — .next/static/chunks/ (19개 JS 파일)

     카테고리  파일수       raw      gzip      한도    상태
────────────────────────────────────────────────────
    framework       6   555.1 KB   167.7 KB   195.3 KB     ✓
          app      13  1224.8 KB   320.4 KB   390.6 KB     ✓
────────────────────────────────────────────────────
         전체      19  1779.9 KB   488.0 KB   566.4 KB     ✓

최대 단일 청크: 0mv65mk9gu7q0.js  85.5 KB (gzip)  한도 107.4 KB  ✓
✓ 모든 번들 한도 통과
```

### Lighthouse (3 페이지, headless desktop, throttle 없음)

| 페이지 | Perf | A11y | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 100 | 1.3s | 0 | 0ms |
| `/posts` | 100 | 100 | 100 | 100 | 0.8s | 0 | 0ms |
| `/posts/new` | 100 | 100 | 100 | 100 | 0.2s | 0 | 0ms |
| **평균** | **99** | **100** | **100** | **100** | | | |

## 평가 / 의도된 한계

**성공:**
- 번들 게이트가 `build-manifest.json` 기반 분류로 Turbopack 구조를 정확히 파악
- Lighthouse가 실제 서버(`next start`)를 띄워 진짜 사용자 경험을 측정
- gate job(5s) 정책 유지 — bundle-gate는 별도 병렬 job
- push:main만 Lighthouse를 실행해 PR CI 시간 최소화

**의도된 한계:**
- Lighthouse 점수가 CI 환경(Linux VM, throttle 없음)과 실제 사용자 환경(모바일, 3G)에서 크게 다름 — lab 기준 점수로만 해석
- 번들 threshold는 현재 + 헤드룸 기반이므로 의도적 최적화 없이는 회귀 감지 용도만
- 공유 청크 내 vendor/pages 세분화 불가 (Turbopack 특성) — 대형 라이브러리 추가 탐지는 총량으로만 가능

## 다음 실험 후보

- 23. Web Vitals RUM — 실제 사용자 브라우저에서 CWV 수집 (실험실 vs 현장 비교)
- 23. 이미지 최적화 계층 — `next/image` 사용 의무화 + alt 텍스트 감사
- 23. 서버 응답 성능 — API 라우트 응답시간 Playwright 측정 + threshold gate
