#!/usr/bin/env node
// 실험 18 — 로컬 무가격 리뷰 계층.
//
// 현 브랜치 변경분 (vs base)을 한 프롬프트로 패키징해 stdout에 뿌린다.
// 용도:
//   1) Claude Code 서브에이전트 (feature-dev:code-reviewer) 호출 시 그대로 prompt로.
//   2) 외부 LLM 인터페이스(ChatGPT/Claude 웹/GitHub Copilot Chat 등)에 복붙.
//   3) 파일로 저장 후 이메일/슬랙에 공유 (인간 리뷰어용 배경 자료).
//
// 과금 없음. CodeRabbit 과 달리 외부 API 를 호출하지 않는다.
//
// 용법:
//   node .claude/scripts/review-local.mjs [--base <ref>] [--max-diff <bytes>]
//
// 기본 base: origin/main → main → HEAD~1 순으로 탐색.

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function shSafe(cmd) {
  try {
    return sh(cmd)
  } catch {
    return ''
  }
}

function parseArgs(argv) {
  const args = { base: null, maxDiff: 120_000 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') args.base = argv[++i]
    else if (a === '--max-diff') args.maxDiff = Number(argv[++i])
  }
  return args
}

function resolveBase(explicit) {
  if (explicit) return explicit
  const candidates = ['origin/main', 'main', 'HEAD~1']
  for (const c of candidates) {
    if (shSafe(`git rev-parse --verify --quiet ${c}`)) return c
  }
  return 'HEAD~1'
}

function readClaudeContext() {
  const out = []
  for (const path of ['CLAUDE.md', 'AGENTS.md']) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf8')
      if (content.length < 4000) out.push({ path, content })
      else out.push({ path, content: content.slice(0, 4000) + '\n… (truncated)' })
    }
  }
  return out
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const base = resolveBase(args.base)
  const head = shSafe('git rev-parse --short HEAD') || 'HEAD'
  const branch = shSafe('git branch --show-current') || '(detached)'

  const diffStat = shSafe(`git diff --stat ${base}...HEAD`)
  const nameStatus = shSafe(`git diff --name-status ${base}...HEAD`)
  const log = shSafe(`git log --oneline ${base}..HEAD`)

  let diff = shSafe(`git diff ${base}...HEAD`)
  let diffTruncated = false
  if (diff.length > args.maxDiff) {
    diff = diff.slice(0, args.maxDiff) + '\n\n… (diff truncated — full diff: git diff ' + base + '...HEAD)'
    diffTruncated = true
  }

  const claudeCtx = readClaudeContext()

  const lines = []
  lines.push('# Code Review Request')
  lines.push('')
  lines.push(`Branch: \`${branch}\` @ ${head}`)
  lines.push(`Base:   \`${base}\``)
  if (diffTruncated) lines.push(`(diff truncated to ${args.maxDiff} bytes — rerun with --max-diff for full)`)
  lines.push('')

  if (log) {
    lines.push('## Commits on branch')
    lines.push('```')
    lines.push(log)
    lines.push('```')
    lines.push('')
  }

  lines.push('## Files changed')
  lines.push('```')
  lines.push(diffStat || '(none)')
  lines.push('```')
  lines.push('')

  if (nameStatus) {
    lines.push('### Name-status')
    lines.push('```')
    lines.push(nameStatus)
    lines.push('```')
    lines.push('')
  }

  if (claudeCtx.length > 0) {
    lines.push('## Project context (CLAUDE.md / AGENTS.md)')
    for (const { path, content } of claudeCtx) {
      lines.push(`### ${path}`)
      lines.push('```markdown')
      lines.push(content)
      lines.push('```')
      lines.push('')
    }
  }

  lines.push('## Diff')
  lines.push('```diff')
  lines.push(diff || '(no changes)')
  lines.push('```')
  lines.push('')

  lines.push('## Review instructions')
  lines.push('')
  lines.push('Apply confidence filtering — only report findings you would act on.')
  lines.push('For each issue: severity (critical/high/medium/low), file:line, what’s wrong,')
  lines.push('why it matters, 1~3줄 fix sketch. Skip style/nit unless it masks a bug.')
  lines.push('Hard cap: under 500 words total. If nothing critical/high, say so and list top 2~3 medium.')
  lines.push('')
  lines.push('Focus areas for this repo:')
  lines.push('- Always-layer rules are already enforced by hook (R1~R5) — do not re-flag them.')
  lines.push('- Unit tests pass; focus on behavior/security/race issues tests could miss.')
  lines.push('- Next.js 16 + React 19 — API may differ from training data. Respect AGENTS.md.')
  lines.push('- Do NOT fix; report only.')

  process.stdout.write(lines.join('\n') + '\n')
}

main()
