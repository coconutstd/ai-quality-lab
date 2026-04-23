# Rule 22: 성능 계층 (번들 게이트 + Lighthouse 리포팅)

## 목적

코드 품질(타입/보안/테스트)은 잡히지만 사용자 체감 속도는 감지되지 않는 공백을 메운다.
두 가지 측정 레이어로 성능 회귀를 조기에 감지한다.

## 규칙 체크리스트

### 번들 게이트 (hard — CI 실패)
- [ ] `.next/static/chunks/` 전체 JS gzip 합계 ≤ 580 KB
- [ ] framework 청크 gzip ≤ 200 KB (rootMainFiles + polyfills)
- [ ] app 청크 gzip ≤ 400 KB (vendor + 앱 코드 Turbopack 공유 청크)
- [ ] 단일 청크 gzip ≤ 110 KB

> Turbopack 은 vendor/pages 를 구분 없이 공유 청크로 합친다. framework 은 build-manifest.json 의 rootMainFiles/polyfillFiles 기준.

### Lighthouse 리포팅 (soft — 아티팩트만)
- [ ] Performance 점수 ≥ 70 (경고 기준)
- [ ] Accessibility 점수 ≥ 90 (경고 기준)
- [ ] LCP < 4s (데스크톱, throttle 없음)
- [ ] CLS < 0.25

## 나쁜 예

```ts
// 대형 라이브러리를 default import 전체 로드
import _ from 'lodash'
import moment from 'moment'
```

## 좋은 예

```ts
// 필요한 함수만 named import
import { debounce } from 'lodash-es'
// 또는 Next.js dynamic import 로 지연 로드
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

## 검증 방법

```bash
# 번들 게이트 (exit 0 = 통과, exit 1 = 실패)
npm run build && npm run bundle:check

# 번들 상세 리포트 (항상 exit 0)
npm run bundle:report

# Lighthouse 측정 (3~5분, lighthouse devDep 필요)
npm run perf:report
ls lighthouse-reports/  # JSON/HTML + summary.json
```

## 임계값 조정

`bundle:check` 실패 시:
1. `npm run bundle:report` 로 카테고리별 gzip 실측값 확인
2. `.claude/rules/config.mjs` 의 `BUNDLE_LIMITS` 수정 (10~20% 여유 권장)
3. 초과 원인 파악: `ANALYZE=true npm run build` (별도 `@next/bundle-analyzer` 설정 필요)

## 적용 대상

- `.next/static/chunks/**/*.js` (번들 게이트)
- `/`, `/posts`, `/posts/new` (Lighthouse 측정 대상 3 페이지)
