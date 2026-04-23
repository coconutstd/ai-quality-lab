#!/usr/bin/env node
// 실험 13 — 컴포넌트 계층 discipline 감사기
//
// components/*.tsx 각각에 대해 동반 산출물(.stories.tsx, __tests__/*.test.tsx)이
// 존재하는지 검사한다. 누락이 있으면 경고 메시지를 stdout으로 출력.
//
// 용법:
//   node .claude/hooks/audit-components.mjs           (report-only, exit 0)
//   node .claude/hooks/audit-components.mjs --strict  (누락 시 exit 1 — CI 게이트용)

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CONFIG } from "../rules/config.mjs";

const ROOT = CONFIG.COMPONENTS_DIR;
const EXCLUDE = new Set(CONFIG.AUDIT_EXCLUDE);

function main() {
  const strict = process.argv.includes("--strict");
  let entries;
  try {
    entries = readdirSync(ROOT);
  } catch {
    process.exit(0);
  }

  const components = entries.filter(
    (f) =>
      f.endsWith(".tsx") &&
      !f.endsWith(".stories.tsx") &&
      !f.endsWith(".test.tsx"),
  );

  const findings = [];
  for (const file of components) {
    const name = file.replace(/\.tsx$/, "");
    if (EXCLUDE.has(name)) continue;

    const hasStory = existsSync(join(ROOT, `${name}.stories.tsx`));
    const hasTest = existsSync(join(ROOT, "__tests__", `${name}.test.tsx`));

    const missing = [];
    if (!hasStory) missing.push(`${name}.stories.tsx`);
    if (!hasTest) missing.push(`__tests__/${name}.test.tsx`);
    if (missing.length) findings.push({ name, missing });
  }

  if (findings.length === 0) {
    console.log(
      `✓ 컴포넌트 계층 감사 통과 — ${components.length}개 컴포넌트 모두 동반 산출물(story + test) 보유.`,
    );
    process.exit(0);
  }

  const lines = [
    `⚠️  컴포넌트 계층 discipline — ${findings.length}건 누락`,
    "",
    ...findings.map((f) => `  ${f.name}.tsx → missing: ${f.missing.join(", ")}`),
    "",
    ".claude/skills/new-component/SKILL.md 규격에 따라 동반 산출물을 함께 만드세요.",
  ];
  console.log(lines.join("\n"));
  process.exit(strict ? 1 : 0);
}

main();
