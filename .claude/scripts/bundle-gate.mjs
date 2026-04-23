#!/usr/bin/env node
// 실험 22 — 빌드 타임 번들 게이트.
// 용법:
//   node .claude/scripts/bundle-gate.mjs             (gate 모드 — 초과 시 exit 1)
//   node .claude/scripts/bundle-gate.mjs --report    (report 모드 — 항상 exit 0)

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { CONFIG } from '../rules/config.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..', '..')
const NEXT_DIR = join(ROOT, '.next')
const CHUNKS_DIR = join(NEXT_DIR, 'static', 'chunks')
const MANIFEST_PATH = join(NEXT_DIR, 'build-manifest.json')

const reportMode = process.argv.includes('--report')

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function loadFrameworkChunkNames() {
  if (!existsSync(MANIFEST_PATH)) return new Set()
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const paths = [
    ...(manifest.rootMainFiles ?? []),
    ...(manifest.polyfillFiles ?? []),
  ]
  return new Set(paths.map((p) => basename(p)))
}

function collectChunks(dir) {
  const files = []

  function walk(current) {
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push({ path: full, name: entry.name })
      }
    }
  }

  walk(dir)
  return files
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error('✗ .next/ 디렉토리가 없습니다. 먼저 npm run build 를 실행하세요.')
    process.exit(1)
  }
  if (!existsSync(CHUNKS_DIR)) {
    console.error('✗ .next/static/chunks/ 가 없습니다. npm run build (production build) 가 필요합니다.')
    process.exit(1)
  }

  const frameworkNames = loadFrameworkChunkNames()
  const chunks = collectChunks(CHUNKS_DIR)

  if (chunks.length === 0) {
    console.error('✗ .next/static/chunks/ 에 JS 파일이 없습니다.')
    process.exit(1)
  }

  const measured = chunks.map(({ path, name }) => {
    const raw = readFileSync(path)
    const gzip = gzipSync(raw).length
    return { name, raw: raw.length, gzip, category: frameworkNames.has(name) ? 'framework' : 'app' }
  })

  const totals = {
    framework: { files: 0, raw: 0, gzip: 0 },
    app:       { files: 0, raw: 0, gzip: 0 },
  }
  for (const { category, raw, gzip } of measured) {
    totals[category].files++
    totals[category].raw += raw
    totals[category].gzip += gzip
  }

  const sumBy = (key) => Object.values(totals).reduce((s, v) => s + v[key], 0)
  const totalGzip  = sumBy('gzip')
  const totalRaw   = sumBy('raw')
  const totalFiles = sumBy('files')
  const maxChunk   = measured.reduce((max, cur) => cur.gzip > max.gzip ? cur : max)

  const limits = CONFIG.BUNDLE_LIMITS

  console.log(`\n번들 게이트 분석 — .next/static/chunks/ (${totalFiles}개 JS 파일)\n`)

  const COL = [12, 6, 10, 10, 10, 6]
  const row = (cols) => cols.map((v, i) => String(v).padStart(COL[i])).join('  ')
  const header = row(['카테고리', '파일수', 'raw', 'gzip', '한도', '상태'])
  console.log(header)
  console.log('─'.repeat(header.length))

  const violations = []
  for (const [cat, { files, raw, gzip }] of Object.entries(totals)) {
    const limit = limits[cat]
    const over = gzip > limit
    if (over) violations.push({ label: cat, gzip, limit })
    console.log(row([cat, files, kb(raw), kb(gzip), kb(limit), over ? '✗' : '✓']))
  }

  console.log('─'.repeat(header.length))
  const totalOver = totalGzip > limits.total
  if (totalOver) violations.push({ label: '전체', gzip: totalGzip, limit: limits.total })
  console.log(row(['전체', totalFiles, kb(totalRaw), kb(totalGzip), kb(limits.total), totalOver ? '✗' : '✓']))

  const chunkOver = maxChunk.gzip > limits.singleChunk
  if (chunkOver) violations.push({ label: `단일 청크(${maxChunk.name})`, gzip: maxChunk.gzip, limit: limits.singleChunk })
  console.log(`\n최대 단일 청크: ${maxChunk.name}  ${kb(maxChunk.gzip)} (gzip)  한도 ${kb(limits.singleChunk)}  ${chunkOver ? '✗' : '✓'}`)

  if (violations.length > 0) {
    console.error('\n✗ 번들 한도 초과:')
    for (const { label, gzip, limit } of violations) {
      console.error(`  ${label}: ${kb(gzip)} > ${kb(limit)}`)
    }
    console.error('\n분석 힌트: npm run bundle:report 로 카테고리별 청크 목록 확인')
    if (!reportMode) process.exit(1)
  } else {
    console.log('\n✓ 모든 번들 한도 통과')
  }
}

main()
