# Rule 04: Tests

## 목적
"중요하지만 작성 시간이 오래 걸려 미루던" 단위 테스트를 자동 생성으로 보강.
02·03 실험에서 만든 에러/보안 컨트랙트를 회귀 방지망으로 잠근다.

## 규칙 체크리스트

### 커버리지
- [ ] zod 스키마는 valid + invalid 경로를 모두 검증
- [ ] sanitize 유틸은 대표 XSS 페이로드(스크립트, 이벤트 핸들러, iframe)를 모두 차단
- [ ] API 함수는 성공 + 서버 에러 + 잘못된 응답 형태를 모두 다룸
- [ ] 외부 의존성(axios, DOM)은 모킹 (테스트 격리)

### 작성 규칙
- [ ] AAA 구조 (Arrange / Act / Assert) 또는 Given-When-Then
- [ ] 테스트 이름은 "무엇이 + 어떻게 동작" 형태 (예: `rejects post with non-numeric id`)
- [ ] 한 테스트 = 한 가지 동작
- [ ] `expect`는 가능하면 1~2개로 제한, 많아지면 테스트 분리
- [ ] 외부 상태(전역, 파일시스템) 의존 금지

### CI/검증
- [ ] `npm run test`로 전체 실행 가능
- [ ] 모든 테스트 1초 이내 완료 (단위 테스트)
- [ ] 실패 시 실패 원인이 메시지만 봐도 명확

## 적용 대상
- `lib/schemas.ts`
- `lib/sanitize.ts`
- `lib/api.ts`
- `lib/auth.ts`

## 검증 방법

```bash
npm run test            # watch
npm run test:run        # 1회 실행
npx vitest run --coverage  # 커버리지 (선택)
```
