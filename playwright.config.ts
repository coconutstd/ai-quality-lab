import { defineConfig, devices } from '@playwright/test'

// 실험 17 — 통합/E2E 계층
// 단위 테스트는 http 모듈을 vi.mock으로 통째로 가짜로 돌리기 때문에
// "/api/* 라우트 부재" 같은 결함을 놓친다. 이 설정은 실제 dev 서버를 올리고
// 브라우저로 앱 전체 경로를 밟아서 단위 계층이 놓치는 결함을 포착한다.

const PORT = Number(process.env.PORT ?? 3100)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Next.js dev는 첫 방문 시 라우트를 on-demand 컴파일해 1~5s 걸릴 수 있다. 여유 있게.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // 같은 인메모리 store를 공유하므로 테스트를 병렬로 돌리지 않는다.
  // (각 테스트가 beforeEach로 reset하지만 병렬 간섭 방지가 안전)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // PORT env로 dev server 포트를 제어해서 사용자가 로컬에서 npm run dev로
    // 3000을 쓰고 있어도 E2E는 3100을 써서 충돌하지 않는다.
    command: `PORT=${PORT} npm run dev`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
