import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'

type ArrayElement<T> = T extends ReadonlyArray<infer Element> ? Element : T
type WebServer = ArrayElement<NonNullable<PlaywrightTestConfig['webServer']>>

const webServer = (command: string, url: string): WebServer => ({
  command,
  reuseExistingServer: false,
  stderr: 'pipe',
  stdout: 'pipe',
  timeout: 120_000,
  url,
})

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env['CI']),
  fullyParallel: false,
  outputDir: 'test-results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  reporter: process.env['CI'] === undefined ? 'line' : [['github'], ['line']],
  retries: process.env['CI'] === undefined ? 0 : 1,
  testDir: './e2e',
  timeout: 30_000,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    webServer('vp run server', 'http://127.0.0.1:3001/health'),
    webServer('vp run --no-cache vite-react-preview', 'http://127.0.0.1:4173'),
    webServer('vp run --no-cache tanstack-start-preview', 'http://127.0.0.1:3000'),
  ],
  workers: 1,
})
