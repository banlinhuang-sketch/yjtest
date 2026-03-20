import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

const webPort = 4179
const webHost = '127.0.0.1'
const formalApiBaseUrl = (process.env.FORMAL_BROWSER_API_BASE_URL ?? process.env.FORMAL_API_BASE_URL ?? '').trim()

function resolveBrowserUse() {
  if (process.platform !== 'win32') {
    return {}
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

  if (fs.existsSync(chromePath)) {
    return {
      channel: 'chrome',
    }
  }

  if (fs.existsSync(edgePath)) {
    return {
      channel: 'msedge',
    }
  }

  return {}
}

const browserUse = resolveBrowserUse()

export default defineConfig({
  testDir: './tests/browser',
  testMatch: /formal-smoke\.spec\.ts/,
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 12_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-formal', open: 'never' }],
  ],
  use: {
    baseURL: `http://${webHost}:${webPort}`,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    acceptDownloads: false,
    ...browserUse,
  },
  webServer: {
    command: 'node scripts/browser-web-server.mjs',
    port: webPort,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      BROWSER_WEB_PORT: String(webPort),
      BROWSER_WEB_HOST: webHost,
      BROWSER_API_BASE_URL: formalApiBaseUrl,
      VITE_API_BACKEND_MODE: 'formal',
      VITE_API_RESPONSE_ENVELOPE: process.env.VITE_API_RESPONSE_ENVELOPE ?? 'auto',
      VITE_API_QUERY_PAGE_KEY: process.env.VITE_API_QUERY_PAGE_KEY ?? '',
      VITE_API_QUERY_PAGE_SIZE_KEY: process.env.VITE_API_QUERY_PAGE_SIZE_KEY ?? '',
      VITE_API_QUERY_LIMIT_KEY: process.env.VITE_API_QUERY_LIMIT_KEY ?? '',
      VITE_API_ROUTE_AUTH_LOGIN: process.env.VITE_API_ROUTE_AUTH_LOGIN ?? '',
      VITE_API_ROUTE_AUTH_ME: process.env.VITE_API_ROUTE_AUTH_ME ?? '',
      VITE_API_ROUTE_CASES_LIST: process.env.VITE_API_ROUTE_CASES_LIST ?? '',
      VITE_API_ROUTE_CASE_DETAIL: process.env.VITE_API_ROUTE_CASE_DETAIL ?? '',
      VITE_API_ROUTE_CASES_GENERATE_DRAFT: process.env.VITE_API_ROUTE_CASES_GENERATE_DRAFT ?? '',
      VITE_API_ROUTE_CASES_REVIEW: process.env.VITE_API_ROUTE_CASES_REVIEW ?? '',
      VITE_API_ROUTE_EXPORTS_CREATE: process.env.VITE_API_ROUTE_EXPORTS_CREATE ?? '',
      VITE_API_ROUTE_EXPORT_TASK: process.env.VITE_API_ROUTE_EXPORT_TASK ?? '',
      VITE_API_ROUTE_EXPORT_HISTORY: process.env.VITE_API_ROUTE_EXPORT_HISTORY ?? '',
      VITE_API_ROUTE_KNOWLEDGE_SOURCES: process.env.VITE_API_ROUTE_KNOWLEDGE_SOURCES ?? '',
      VITE_API_ROUTE_AUDIT_LOGS: process.env.VITE_API_ROUTE_AUDIT_LOGS ?? '',
    },
  },
})
