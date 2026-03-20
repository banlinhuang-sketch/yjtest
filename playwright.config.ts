import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

const webPort = 4178
const apiPort = 8797

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
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 12_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    acceptDownloads: true,
    ...browserUse,
  },
  webServer: [
    {
      command: 'node scripts/browser-api-server.mjs',
      port: apiPort,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BROWSER_API_PORT: String(apiPort),
        BROWSER_API_HOST: '127.0.0.1',
      },
    },
    {
      command: 'node scripts/browser-web-server.mjs',
      port: webPort,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BROWSER_WEB_PORT: String(webPort),
        BROWSER_WEB_HOST: '127.0.0.1',
        BROWSER_API_PORT: String(apiPort),
      },
    },
  ],
})
