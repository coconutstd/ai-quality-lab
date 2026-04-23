# AI Quality Starter

AI 시대의 "기본값이 된 품질 항목"을 **세션 내부 → 컴포넌트 생성 → 커밋·PR** 세 계층에서 자동 적용하는 스타터 번들.

- **세션 내부 (Hard 차단)**: `.claude/hooks/guard-always-layer.mjs` — Write/Edit 시점에 any/토큰 유출/XSS sink 등 5개 규칙을 정적 패턴으로 차단
- **컴포넌트 생성 (Skill + Audit)**: `.claude/skills/new-component/SKILL.md` — 컴포넌트 1개 요청에 tsx/stories/test/i18n 4종을 동시 산출; `.claude/hooks/audit-components.mjs` 가 세션 종료 시 누락 감사
- **커밋·PR (통합 게이트)**: `.githooks/pre-push` + `.github/workflows/pr-gate.yml` — 동일한 `npm run pr:gate` 를 로컬·CI 양쪽에서 실행

## 이식 단계

```bash
# 1. 스타터 복사 (점 파일 포함)
cp -a starter/. /path/to/your-project/

# 2. 프로젝트 이동 + npm scripts 병합
cd /path/to/your-project
# package.json 의 "scripts" 에 아래 6개를 병합:
#   "typecheck": "tsc --noEmit"
#   "audit:components": "node .claude/hooks/audit-components.mjs --strict"
#   "sync:rules": "node .claude/scripts/sync-rules.mjs"
#   "check:rules": "node .claude/scripts/sync-rules.mjs --check"
#   "test:guard": "node .claude/hooks/test-guard.mjs"
#   "pr:gate": "npm run lint && npm run typecheck && npm run test:run && npm run audit:components && npm run check:rules && npm run test:guard"

# 3. 프로젝트 실정에 맞게 config 수정
#    .claude/rules/config.mjs — COMPONENTS_DIR, SAFE_HTML_SINK_PATHS 등
#    CLAUDE.md — "프로젝트 개요" 섹션

# 4. 생성 블록 채우기
npm run sync:rules

# 5. git hook 활성화 (clone 직후 1회)
git config core.hooksPath .githooks

# 6. 게이트 초기 검증
npm run pr:gate
```

## 선행 조건

- Node 20+ (hook 스크립트가 ES modules 사용)
- 기존 프로젝트에 `npm run lint`, `npm run test:run` 가 존재하거나 추가 필요
- TypeScript 프로젝트 — R1(any 규칙)이 .ts/.tsx 기준. JS 전용 프로젝트는 always-layer.mjs 의 appliesToPath 를 수정

## 구성 파일

```
.claude/
├── settings.json                     # Claude Code hooks 등록 (PreToolUse + SessionEnd)
├── hooks/
│   ├── guard-always-layer.mjs        # PreToolUse — SSOT 규칙 실행
│   ├── audit-components.mjs          # 컴포넌트 discipline 감사 (세션/PR 양용)
│   └── test-guard.mjs                # guard 단위 테스트 (17 케이스)
├── rules/
│   ├── always-layer.mjs              # SSOT — 5개 규칙 정의 (수정 후 sync:rules)
│   └── config.mjs                    # 프로젝트-로컬 경로/화이트리스트 설정
├── scripts/
│   └── sync-rules.mjs                # SSOT → CLAUDE.md 생성기 (--check 모드 pr:gate 용)
└── skills/
    └── new-component/SKILL.md        # 컴포넌트 4종 산출 계약

.githooks/pre-push                    # 로컬 push 직전 pr:gate
.github/workflows/pr-gate.yml         # CI 게이트 + CodeRabbit 리뷰 (시크릿 옵트인)
CLAUDE.md                             # 항상 계층 블록 + 추가 가이드
```

## 커스터마이즈 포인트

- **새 Hard 규칙 추가**: `.claude/rules/always-layer.mjs` 의 RULES 배열에 하나 더 → `sync:rules` → 반드시 `test:guard` 단위 테스트에도 케이스 추가.
- **경로 레이아웃이 다르면**: `.claude/rules/config.mjs` 의 `COMPONENTS_DIR` 수정. R3 화이트리스트도 여기.
- **CR 비활성화**: 워크플로우 `review` job 삭제 또는 `CODERABBIT_API_KEY` 시크릿 미설정 (자동 스킵).
- **ESLint strict 병행**: starter 자체는 ESLint config 포함하지 않음 — 프로젝트의 기존 config 에 jsx-a11y 등 추가 권장.
