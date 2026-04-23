#!/usr/bin/env node
// Unit test harness for guard-always-layer hook.
// Pipes synthetic PreToolUse payloads through the guard and checks stdout.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CONFIG } from "../rules/config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = join(here, "guard-always-layer.mjs");

// config-aware sink path: 첫 번째 화이트리스트 경로 패턴에서 실제 경로 유도.
// 빈 배열이면 면제 테스트(S7b)를 스킵하고 추가 "모든 곳 차단" 테스트로 대체.
function sinkSamplePath() {
  const first = CONFIG.SAFE_HTML_SINK_PATHS[0];
  if (!first) return null;
  // 정규식 source 에서 구체 경로 하나 생성: components\/SafeHtml\.tsx$ → /abs/components/SafeHtml.tsx
  const raw = first.source.replace(/\\\//g, "/").replace(/\\\./g, ".").replace(/\$$/, "");
  return `/abs/${raw}`;
}

const SINK = sinkSamplePath();

const cases = [
  // Expected to BLOCK
  {
    name: "S1 any in param type",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/orders.ts",
        content: "export async function fetchOrder(id: any) { return id; }",
      },
    },
  },
  {
    name: "S6 localStorage token",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/auth.ts",
        content: "export function save(t: string) { localStorage.setItem('token', t); }",
      },
    },
  },
  {
    name: "S7 dangerouslySetInnerHTML outside SafeHtml",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/app/posts/[id]/page.tsx",
        content: "export default function P(){return <div dangerouslySetInnerHTML={{__html: x}}/>}",
      },
    },
  },
  ...(SINK
    ? [
        {
          name: `S7b dangerouslySetInnerHTML allowed in configured sink (${SINK})`,
          expect: "pass",
          payload: {
            tool_name: "Write",
            tool_input: {
              file_path: SINK,
              content: "return <div dangerouslySetInnerHTML={{__html: clean}}/>",
            },
          },
        },
      ]
    : [
        {
          name: "S7b no sink configured → dangerouslySetInnerHTML blocked anywhere",
          expect: "block",
          payload: {
            tool_name: "Write",
            tool_input: {
              file_path: "/abs/components/AnyComponent.tsx",
              content: "return <div dangerouslySetInnerHTML={{__html: x}}/>",
            },
          },
        },
      ]),
  {
    name: "S8 console.log token",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/auth.ts",
        content: "console.log('token:', tok)",
      },
    },
  },
  {
    name: "S9 NEXT_PUBLIC_ SECRET",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/config.ts",
        content: "const k = process.env.NEXT_PUBLIC_API_SECRET",
      },
    },
  },
  // Expected to PASS
  {
    name: "clean TS — no any, typed",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "export function add(a: number, b: number): number { return a + b; }",
      },
    },
  },
  {
    name: "unknown is OK (not any)",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "export function parse(x: unknown): string { return String(x); }",
      },
    },
  },
  {
    name: "word 'many' should not trigger any",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "// too many retries\nexport const x: number = 1;",
      },
    },
  },
  {
    name: "Array<any> should still block",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "const xs: any[] = [];",
      },
    },
  },
  {
    name: "generic any should block",
    expect: "block",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "const x: Array<any> = [];",
      },
    },
  },
  {
    name: "localStorage for non-token key passes",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/prefs.ts",
        content: "localStorage.setItem('theme', 'dark')",
      },
    },
  },
  {
    name: "console.log unrelated is fine",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        content: "console.log('user count:', n)",
      },
    },
  },
  {
    name: "NEXT_PUBLIC_API_URL is fine (no SECRET/PRIVATE/PASSWORD)",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/lib/config.ts",
        content: "const u = process.env.NEXT_PUBLIC_API_URL",
      },
    },
  },
  {
    name: "Edit new_string clean",
    expect: "pass",
    payload: {
      tool_name: "Edit",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        old_string: "x",
        new_string: "const y: number = 1;",
      },
    },
  },
  {
    name: "Edit new_string with any blocks",
    expect: "block",
    payload: {
      tool_name: "Edit",
      tool_input: {
        file_path: "/abs/lib/util.ts",
        old_string: "x",
        new_string: "function f(data: any) {}",
      },
    },
  },
  {
    name: "Non-code file not checked",
    expect: "pass",
    payload: {
      tool_name: "Write",
      tool_input: {
        file_path: "/abs/docs/notes.md",
        content: "localStorage.setItem('token', 'abc') — 이건 예시지만 md 파일이라 통과",
      },
    },
  },
];

let pass = 0;
let fail = 0;
const failures = [];

for (const c of cases) {
  const res = spawnSync("node", [HOOK], {
    input: JSON.stringify(c.payload),
    encoding: "utf8",
  });
  const out = res.stdout.trim();
  let decision = "pass";
  if (out) {
    try {
      const parsed = JSON.parse(out);
      if (parsed.hookSpecificOutput?.permissionDecision === "deny") {
        decision = "block";
      }
    } catch {
      // non-JSON output treated as pass
    }
  }
  const ok = decision === c.expect;
  if (ok) {
    pass++;
    console.log(`✓ ${c.name}`);
  } else {
    fail++;
    failures.push({ name: c.name, expected: c.expect, got: decision, output: out });
    console.log(`✗ ${c.name} — expected ${c.expect}, got ${decision}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed (total ${cases.length})`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  ${f.name}: ${JSON.stringify(f, null, 2)}`);
  }
  process.exit(1);
}
