#!/usr/bin/env node
// 실험 22 — 런타임 Lighthouse 리포팅 (soft — 항상 exit 0).
// 용법:
//   node .claude/scripts/perf-report.mjs
// 환경변수:
//   CHROME_PATH — Chrome/Chromium 바이너리 경로 (없으면 chrome-launcher 자동 탐지)

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '..', '..')
const REPORTS_DIR = join(ROOT, 'lighthouse-reports')
const PORT = 3999
const BASE_URL = `http://localhost:${PORT}`

const PAGES = [
  { path: '/',          slug: 'index'     },
  { path: '/posts',     slug: 'posts'     },
  { path: '/posts/new', slug: 'posts-new' },
]

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(
      process.execPath,
      [join(ROOT, 'node_modules', '.bin', 'next'), 'start', '--port', String(PORT)],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    )

    const timeout = setTimeout(() => {
      server.kill()
      reject(new Error('서버 시작 30초 초과'))
    }, 30_000)

    server.stdout.on('data', (chunk) => {
      if (chunk.toString().toLowerCase().includes('ready')) {
        clearTimeout(timeout)
        resolve(server)
      }
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout)
        reject(new Error(`서버가 코드 ${code}로 종료. npm run build 를 먼저 실행하세요.`))
      }
    })
  })
}

async function measurePage(lighthouse, url, slug, chromePort) {
  const result = await lighthouse(url, {
    port: chromePort,
    output: ['json', 'html'],
    logLevel: 'silent',
    throttlingMethod: 'provided',
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  })

  writeFileSync(join(REPORTS_DIR, `${slug}.json`), result.report[0], 'utf8')
  writeFileSync(join(REPORTS_DIR, `${slug}.html`), result.report[1], 'utf8')

  const lhr = result.lhr
  return {
    path: url.replace(BASE_URL, '') || '/',
    slug,
    performance:   Math.round((lhr.categories.performance?.score        ?? 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score      ?? 0) * 100),
    bestPractices: Math.round((lhr.categories['best-practices']?.score  ?? 0) * 100),
    seo:           Math.round((lhr.categories.seo?.score                ?? 0) * 100),
    lcp: lhr.audits['largest-contentful-paint']?.displayValue ?? '—',
    cls: lhr.audits['cumulative-layout-shift']?.displayValue  ?? '—',
    tbt: lhr.audits['total-blocking-time']?.displayValue      ?? '—',
  }
}

function printSummary(results) {
  console.log('\nLighthouse 성능 리포트\n')
  const header = 'Page'.padEnd(18) + 'Perf'.padStart(6) + 'A11y'.padStart(6) + 'Best'.padStart(6) + 'SEO'.padStart(6) + '  LCP'.padStart(10) + '  CLS'.padStart(8) + '  TBT'.padStart(10)
  console.log(header)
  console.log('─'.repeat(header.length))

  for (const r of results) {
    console.log(
      r.path.padEnd(18) +
      String(r.performance).padStart(6) +
      String(r.accessibility).padStart(6) +
      String(r.bestPractices).padStart(6) +
      String(r.seo).padStart(6) +
      r.lcp.padStart(10) +
      r.cls.padStart(8) +
      r.tbt.padStart(10)
    )
  }

  console.log('─'.repeat(header.length))
  const avg = (key) => Math.round(results.reduce((s, r) => s + r[key], 0) / results.length)
  console.log(
    '평균'.padEnd(18) +
    String(avg('performance')).padStart(6) +
    String(avg('accessibility')).padStart(6) +
    String(avg('bestPractices')).padStart(6) +
    String(avg('seo')).padStart(6)
  )
  console.log(`\n리포트 저장: ${REPORTS_DIR}/`)
}

async function main() {
  let server
  let chrome

  // 모듈을 한 번만 로드 — Chrome 도 한 번만 launch 해 3 페이지에서 재사용
  const { default: lighthouse } = await import('lighthouse')
  const { launch } = await import('chrome-launcher')

  try {
    console.log('서버 시작 중... (npm run build 가 완료된 상태여야 합니다)')
    server = await startServer()
    console.log(`서버 준비 완료 — port ${PORT}\n`)

    mkdirSync(REPORTS_DIR, { recursive: true })

    chrome = await launch({
      chromePath: process.env.CHROME_PATH || undefined,
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })

    const results = []
    for (const page of PAGES) {
      const url = `${BASE_URL}${page.path}`
      console.log(`측정 중: ${url}`)
      results.push(await measurePage(lighthouse, url, page.slug, chrome.port))
    }

    writeFileSync(
      join(REPORTS_DIR, 'summary.json'),
      JSON.stringify({ measuredAt: new Date().toISOString(), pages: results }, null, 2),
      'utf8'
    )

    printSummary(results)
  } catch (err) {
    console.error(`\n⚠️  Lighthouse 실행 오류: ${err.message}`)
    console.error('성능 측정은 선택적 리포팅입니다 — CI는 계속 진행됩니다.')
  } finally {
    await chrome?.kill()
    if (server) server.kill('SIGTERM')
  }

  process.exit(0)
}

main()
