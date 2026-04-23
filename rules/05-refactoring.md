# Rule 05: Refactoring (with Test Safety Net)

## 목적
"동작하는 코드를 건드리는 두려움"을 테스트가 흡수하도록, 리팩터링과 테스트를 한 사이클로 묶는다.

## 규칙 체크리스트

### 안전망
- [ ] 리팩터링 직전 — 변경 영역의 동작을 단위 테스트로 잠금
- [ ] 테스트가 모두 GREEN인 상태에서 리팩터링 시작
- [ ] 리팩터링 중간에도 테스트는 항상 통과
- [ ] 외부 동작(공개 API의 입출력)은 변하지 않음

### 리팩터링 방향
- [ ] **위험 API의 봉인** — `dangerouslySetInnerHTML`, `localStorage` 등은 안전한 컴포넌트/유틸로 래핑
- [ ] **단일 출처(SSOT)** — 같은 규칙이 두 곳에 있으면 한 곳으로
- [ ] **사용 지점에서 안전** — 잘못 쓰기 어렵게 (e.g. 컴포넌트 강제 통과)
- [ ] **테스트 가능성 향상** — 순수 함수 추출 / 의존성 주입

### 검증
- [ ] `npm run test:run` 모두 GREEN
- [ ] `npx tsc --noEmit --strict` 통과
- [ ] `npm run lint` 통과
- [ ] 기존 호출부 동작 변화 없음 (tests로 보장)

## 적용 대상 (이번 차수)
- `app/posts/[id]/page.tsx` — `dangerouslySetInnerHTML` 직접 사용 → `<SafeHtml>` 컴포넌트로 봉인
- `lib/http.ts` — 인터셉터 안의 에러 변환 로직을 순수 함수로 추출 → 테스트 용이성 ↑
