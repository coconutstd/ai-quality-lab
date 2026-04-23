#!/usr/bin/env node
// 실험 19 — Stop hook으로 simplify 스킬 자동 트리거.
// 게이트에 넣지 않는 이유: pr:gate 는 5초 성질 유지 (실험 14 정책).
// 이 hook 은 Claude 턴 루프 내부에서만 작동하므로 CI/강제 머지에 영향 없음.

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import { join } from 'node:path'

const CACHE_DIR = '.claude/cache'
const MARKER_PREFIX = 'simplified-'
const PRUNE_SENTINEL = '.last-prune'
const MARKER_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const PRUNE_INTERVAL_MS = 1000 * 60 * 60 * 24 // 하루 1회만 prune
const MAX_HASH_BYTES = 256 * 1024 // 파일당 hash 상한 — 대용량/바이너리 보호

const CODE_EXT = /\.(tsx?|jsx?|mjs|cjs|css)$/

function sh(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    return ''
  }
}

function passthrough() {
  // 아무 출력도 내지 않으면 Claude 가 정상적으로 stop 한다.
  process.exit(0)
}

function block(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason,
    }),
  )
  process.exit(0)
}

function readPayload() {
  try {
    const raw = readFileSync(0, 'utf8')
    return raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

function pruneStaleMarkers() {
  if (!existsSync(CACHE_DIR)) return
  const sentinel = join(CACHE_DIR, PRUNE_SENTINEL)
  const now = Date.now()
  try {
    if (existsSync(sentinel) && now - statSync(sentinel).mtimeMs < PRUNE_INTERVAL_MS) {
      return
    }
  } catch {
    /* ignore */
  }
  for (const name of readdirSync(CACHE_DIR)) {
    if (!name.startsWith(MARKER_PREFIX)) continue
    const path = join(CACHE_DIR, name)
    try {
      if (now - statSync(path).mtimeMs > MARKER_TTL_MS) unlinkSync(path)
    } catch {
      /* ignore */
    }
  }
  try {
    writeFileSync(sentinel, String(now))
  } catch {
    /* ignore */
  }
}

function collectChangedFiles() {
  // HEAD 대비 working tree 전체(staged+unstaged+untracked). Stop payload 로는
  // "이번 턴에 건드린 목록"을 알 수 없어 미커밋 전체를 대상으로 삼는다.
  // 커밋 후에는 diff 가 비어 자동 스킵.
  const tracked = sh('git diff --name-only HEAD').split('\n').filter(Boolean)
  const untracked = sh('git ls-files --others --exclude-standard')
    .split('\n')
    .filter(Boolean)
  const all = [...new Set([...tracked, ...untracked])]
  return all.filter((f) => CODE_EXT.test(f))
}

function computeFingerprint(files) {
  // 파일별 size+mtime 을 먼저, 작은 파일은 내용까지 해시. 대용량/바이너리는 content skip.
  const hasher = createHash('sha1')
  for (const f of files.sort()) {
    hasher.update(f)
    hasher.update('\0')
    try {
      const st = statSync(f)
      hasher.update(`${st.size}:${st.mtimeMs}`)
      if (st.size <= MAX_HASH_BYTES) {
        hasher.update('\0')
        hasher.update(readFileSync(f))
      }
    } catch {
      hasher.update('<missing>')
    }
    hasher.update('\0')
  }
  return hasher.digest('hex').slice(0, 16)
}

function main() {
  const payload = readPayload()

  // 재진입 방지: block 후 Claude 가 다시 stop 하면 payload.stop_hook_active=true 로 온다.
  if (payload.stop_hook_active) passthrough()

  // SubagentStop 이벤트는 서브에이전트 자신이 끝날 때 — simplify 를 재귀 호출하면 안 됨.
  if (payload.hook_event_name === 'SubagentStop') passthrough()

  // opt-out
  if (process.env.LAB_SKIP_REVIEW === '1') passthrough()

  // git repo 가 아니면 통과
  if (!sh('git rev-parse --is-inside-work-tree').includes('true')) passthrough()

  const changed = collectChangedFiles()
  if (changed.length === 0) passthrough()

  ensureCacheDir()
  pruneStaleMarkers()

  const fp = computeFingerprint(changed)
  const markerPath = join(CACHE_DIR, `${MARKER_PREFIX}${fp}`)
  if (existsSync(markerPath)) passthrough()

  // 마커를 block 전에 기록 — Claude 가 simplify 로 진입하면 파일이 바뀌고 지문도
  // 달라져 다음 Stop 이 새 지문으로 한 번 더 block 가능. 2라운드에서 깔끔하면
  // LAB_SKIP_REVIEW=1 로 skip. simplify 가 끝나는 시점에 마커를 rename 하는 건
  // 스킬측 협조가 필요해 후속 실험으로.
  writeFileSync(markerPath, `${new Date().toISOString()}\n${changed.join('\n')}\n`)

  const fileList = changed.slice(0, 20).map((f) => `  - ${f}`).join('\n')
  const overflow = changed.length > 20 ? `\n  … +${changed.length - 20} more` : ''

  const reason = [
    '🔁 auto-simplify hook — 이번 턴에서 코드 파일이 변경되었습니다.',
    '',
    '다음을 수행하세요:',
    '  1) `simplify` 스킬을 호출 (Skill tool, skill="simplify")',
    '  2) 스킬이 reuse / quality / efficiency 관점으로 변경분을 리뷰하고 필요 시 수정',
    '  3) 수정 후 `npm run pr:gate` 로 회귀 확인',
    '',
    `대상 파일 (${changed.length}개):`,
    fileList + overflow,
    '',
    `지문: ${fp}`,
    '스킵이 필요하면 환경변수 LAB_SKIP_REVIEW=1 로 Claude Code 를 재시작하세요.',
  ].join('\n')

  block(reason)
}

main()
