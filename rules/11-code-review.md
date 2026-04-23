# Rule 11: AI Pre-Review (CodeRabbit)

## 목적
PR 올리기 전 제3자 시각으로 변경사항을 자동 리뷰. 사람 리뷰어 시간이 비싸기 전에, AI가 "내가 놓친 게 있나" 한 번 훑어주는 안전망.

## 규칙 체크리스트

### 실행
- [ ] `coderabbit review --agent -t all` (또는 `committed` / `uncommitted`)
- [ ] PR 열기 직전 또는 큰 변경 묶음 직후
- [ ] 빌드/테스트 통과한 상태에서 실행 (CR가 같은 lint/test 이슈를 또 올리지 않게)

### 처리 (분류 → 결정)
- [ ] **진짜 가치 있는 finding** → 코드 수정 + 회귀 방지 테스트
- [ ] **거짓 양성** (CR의 학습 데이터가 라이브러리 신버전을 모름 등) → 결정 사유를 결과 문서에 기록
- [ ] **범위 밖** (생성된 산출물, 외부 코드) → `.gitignore` 등으로 잡음 차단

### 회귀 방지
- [ ] CR가 잡은 진짜 버그는 단위 테스트로 잠금
- [ ] 같은 패턴이 다음 변경에도 나오면 lint rule로 승격 검토

## 적용 대상
- 모든 PR (또는 main 직전 큰 commit 묶음)

## 검증 방법
```bash
coderabbit review --agent -t all
```
