# CLAUDE.md

<!-- 이 파일은 Claude Code / AI 에이전트가 이 레포에서 작업할 때 참조하는 지시서입니다. -->
<!-- 프로젝트 개요와 아키텍처 노트는 이 파일에 자유롭게 쓰되, 아래 "항상 계층" 블록은 자동 생성이니 수정하지 마세요. -->

## 프로젝트 개요

> (여기를 이 프로젝트의 설명으로 교체하세요.)

## 주요 명령어

```bash
npm run dev          # 개발 서버
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test:run     # 단위 테스트
npm run pr:gate      # lint + typecheck + test + audit + SSOT 동기 + guard 단위
npm run sync:rules   # CLAUDE.md 항상 계층 블록을 SSOT에서 재생성
```

---

<!-- rules:always-layer:begin -->
<!-- rules:always-layer:end -->

## 추가 가이드 (Hard로 차단 불가, Soft 유도)

정적 패턴으로 잡기 어려운 항목은 hook에 없다. AI가 코드 작성 시 자발적으로 지켜야 할 기본값:

### 에러 핸들링
- 모든 `async/await`에 `try-catch` 또는 `.catch()`. fetch는 `response.ok` 체크.
- 로딩/에러 상태 UI 필수. 에러는 콘솔이 아니라 사용자에게 전달.
- 폼 제출 중 중복 클릭 방지 (버튼 비활성화).

### 입력 검증
- 사용자 입력은 서버로 보내기 전 기본 검증 (이메일/길이 등).
- 클라이언트 검증과 서버 검증은 동일한 스키마(zod 등) 재사용.

---

## 세 계층 방어 지도

```
코드 작성 (항상)       → PreToolUse hook              : 정적 위반 Hard 차단
컴포넌트 생성          → Skill + SessionEnd audit     : 4종 동반 산출 유도
커밋/푸시 직전         → pre-push → pr:gate           : 통합 검증
PR 올림                → GitHub Actions + CR          : CI 게이트 + AI 사전 리뷰
```

규칙 수정 흐름: `.claude/rules/always-layer.mjs` 편집 → `npm run sync:rules` → `npm run pr:gate` 확인.
