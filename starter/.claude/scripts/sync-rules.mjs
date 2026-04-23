#!/usr/bin/env node
// SSOT → CLAUDE.md 생성기.
//
// `.claude/rules/always-layer.mjs` 의 RULES 로 CLAUDE.md 내 BEGIN/END 블록을 재작성한다.
//
// 용법:
//   node .claude/scripts/sync-rules.mjs            (쓰기 모드 — 필요 시 파일 갱신)
//   node .claude/scripts/sync-rules.mjs --check    (비교 모드 — drift 시 exit 1, PR gate 용)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { RULES } from "../rules/always-layer.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..", "..");
const CLAUDE_MD = resolve(ROOT, "CLAUDE.md");

const BEGIN = "<!-- rules:always-layer:begin -->";
const END = "<!-- rules:always-layer:end -->";

function renderSection() {
  const lines = [
    BEGIN,
    "<!-- 이 블록은 `.claude/rules/always-layer.mjs` 에서 생성됩니다. 직접 수정하지 마세요. -->",
    "<!-- 규칙을 바꾸려면 SSOT 파일을 고친 뒤 `npm run sync:rules` 실행. -->",
    "",
    "## 항상 계층 (코드 작성 시 자동 적용)",
    "",
    "아래 규칙은 **요청에 명시되지 않아도** 모든 코드 생성/수정에서 기본값이다.",
    "`.claude/hooks/guard-always-layer.mjs` 가 Write/Edit 시점에 정적 패턴을 **기계 차단** 한다.",
    "",
    "| ID | 규칙 | 출처 |",
    "|---|---|---|",
    ...RULES.map((r) => `| ${r.id} | ${r.summary} | \`${r.sourceRule}\` |`),
    "",
    "### 규칙 위반 대응",
    "hook이 위반을 발견해 편집을 차단하면, 차단 사유에 적힌 대안(예: `<SafeHtml />`, `unknown` + 타입 가드)으로 재작성 후 다시 시도한다. hook을 우회하는 수정은 하지 않는다 — 맥락상 예외가 필요하면 사용자에게 사유를 먼저 설명.",
    "",
    END,
  ];
  return lines.join("\n");
}

function replaceBlock(source, generated) {
  const beginIdx = source.indexOf(BEGIN);
  const endIdx = source.indexOf(END);

  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(
      `CLAUDE.md에 ${BEGIN} / ${END} 마커를 찾지 못했습니다. 초기 설치가 필요합니다.`,
    );
  }
  return source.slice(0, beginIdx) + generated + source.slice(endIdx + END.length);
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const current = readFileSync(CLAUDE_MD, "utf8");
  const generated = renderSection();
  const next = replaceBlock(current, generated);

  if (current === next) {
    console.log(`✓ CLAUDE.md 항상 계층 블록 — SSOT와 동기화됨 (${RULES.length}개 규칙).`);
    process.exit(0);
  }

  if (checkOnly) {
    console.error(
      [
        "✗ CLAUDE.md 항상 계층 블록이 SSOT와 다릅니다.",
        `  SSOT: .claude/rules/always-layer.mjs (${RULES.length}개 규칙)`,
        "  해결: `npm run sync:rules` 실행 후 재커밋.",
      ].join("\n"),
    );
    process.exit(1);
  }

  writeFileSync(CLAUDE_MD, next, "utf8");
  console.log(`✓ CLAUDE.md 블록 갱신 — ${RULES.length}개 규칙 반영.`);
}

main();
