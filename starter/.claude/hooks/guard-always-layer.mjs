#!/usr/bin/env node
// PreToolUse hook — "항상 계층" 규칙 Hard 차단.
// 규칙 정의는 .claude/rules/always-layer.mjs (SSOT). 이 파일은 단순 소비자.
//
// stdin : Claude Code PreToolUse payload (JSON)
// stdout: 차단 시 {hookSpecificOutput:{permissionDecision:"deny", permissionDecisionReason:"..."}}
// exit  : 항상 0 (결정은 stdout으로만)

import { readFileSync } from "node:fs";
import { RULES, excerpt } from "../rules/always-layer.mjs";

function extractTarget(payload) {
  const name = payload.tool_name || payload.toolName;
  const input = payload.tool_input || payload.toolInput || {};
  if (name === "Write") return { path: input.file_path, content: input.content ?? "" };
  if (name === "Edit") return { path: input.file_path, content: input.new_string ?? "" };
  if (name === "NotebookEdit")
    return { path: input.notebook_path, content: input.new_source ?? "" };
  return null;
}

function block(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function main() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }
  if (!raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const target = extractTarget(payload);
  if (!target || !target.path) process.exit(0);

  const violations = [];
  for (const rule of RULES) {
    if (!rule.appliesToPath(target.path)) continue;
    const hit = rule.detect(target.content);
    if (hit) {
      violations.push({
        id: rule.id,
        label: `${rule.label} (${rule.sourceRule})`,
        remediation: rule.remediation,
        excerpt: excerpt(target.content, hit.index),
      });
    }
  }

  if (violations.length === 0) process.exit(0);

  const lines = [
    `🚫 항상 계층 규칙 위반 — ${violations.length}건 (파일: ${target.path})`,
    "",
    ...violations.map((v) => `[${v.id}] ${v.label}\n    매치: …${v.excerpt}…`),
    "",
    "수정 가이드:",
    ...violations.map((v) => `  ${v.id}: ${v.remediation}`),
  ];
  block(lines.join("\n"));
}

main();
