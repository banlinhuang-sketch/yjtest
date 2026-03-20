import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const apiOrigin = process.env.API_BASE_URL ?? 'http://127.0.0.1:8787'
const webOrigin =
  process.env.WEB_BASE_URL ?? (process.platform === 'linux' ? 'http://127.0.0.1' : 'http://127.0.0.1:4177')
const pm2AppName = process.env.PM2_APP_NAME ?? 'yijing-demo-api'
const nginxServiceName = process.env.NGINX_SERVICE_NAME ?? 'nginx'
const minFreeDiskGb = Math.max(Number.parseFloat(process.env.MONITOR_MIN_FREE_GB ?? '2') || 2, 0.5)
const skipWeb = process.env.MONITOR_SKIP_WEB === '1'

function createCheck(name, ok, details = {}) {
  return {
    name,
    ok,
    details,
  }
}

function readShellOutput(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

async function checkWebShell() {
  if (skipWeb) {
    return createCheck('web-shell', true, { skipped: true })
  }

  const response = await fetch(webOrigin)
  if (!response.ok) {
    throw new Error(`web responded with ${response.status}`)
  }

  const text = await response.text()
  if (!text.includes('<!doctype html') && !text.includes('<!DOCTYPE html')) {
    throw new Error('web did not return the app shell')
  }

  return createCheck('web-shell', true, { url: webOrigin })
}

async function checkApiHealth() {
  const response = await fetch(`${apiOrigin.replace(/\/+$/, '')}/api/v1/health`)
  if (!response.ok) {
    throw new Error(`api responded with ${response.status}`)
  }

  const payload = await response.json()
  if (payload.status !== 'ok') {
    throw new Error('api health status is not ok')
  }

  return payload
}

function checkPathExists(name, targetPath) {
  const exists = Boolean(targetPath) && fs.existsSync(targetPath)
  return createCheck(name, exists, {
    path: targetPath,
    exists,
  })
}

function checkDiskSpace(targetPath) {
  const resolvedPath = targetPath && fs.existsSync(targetPath) ? targetPath : process.cwd()

  if (process.platform !== 'linux') {
    return createCheck('disk-space', true, {
      skipped: true,
      platform: process.platform,
      path: resolvedPath,
    })
  }

  const output = readShellOutput('df', ['-Pk', resolvedPath])
  const [, line] = output.split(/\r?\n/)
  const columns = line.trim().split(/\s+/)
  const availableKb = Number.parseInt(columns[3] ?? '0', 10)
  const usedPercent = columns[4] ?? ''
  const freeGb = Number((availableKb / 1024 / 1024).toFixed(2))

  return createCheck('disk-space', freeGb >= minFreeDiskGb, {
    path: resolvedPath,
    freeGb,
    usedPercent,
    minFreeDiskGb,
  })
}

function checkLinuxService(name, serviceName) {
  if (process.platform !== 'linux') {
    return createCheck(name, true, {
      skipped: true,
      platform: process.platform,
    })
  }

  try {
    const output = readShellOutput('systemctl', ['is-active', serviceName])
    return createCheck(name, output === 'active', {
      service: serviceName,
      status: output,
    })
  } catch (error) {
    return createCheck(name, false, {
      service: serviceName,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function checkPm2App(name) {
  if (process.platform !== 'linux') {
    return createCheck('pm2-app', true, {
      skipped: true,
      platform: process.platform,
    })
  }

  try {
    const raw = readShellOutput('pm2', ['jlist'])
    const items = JSON.parse(raw)
    const matched = Array.isArray(items) ? items.find((item) => item.name === name) : null

    if (!matched) {
      return createCheck('pm2-app', false, {
        app: name,
        status: 'missing',
      })
    }

    return createCheck('pm2-app', matched.pm2_env?.status === 'online', {
      app: name,
      status: matched.pm2_env?.status ?? 'unknown',
      restarts: matched.pm2_env?.restart_time ?? 0,
      pid: matched.pid ?? null,
    })
  } catch (error) {
    return createCheck('pm2-app', false, {
      app: name,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function main() {
  const checks = []

  const webCheck = await checkWebShell()
  checks.push(webCheck)

  const apiHealth = await checkApiHealth()
  checks.push(
    createCheck('api-health', true, {
      url: `${apiOrigin.replace(/\/+$/, '')}/api/v1/health`,
      storage: apiHealth.storage ?? {},
    }),
  )

  const sqlitePath = apiHealth.storage?.filePath ? path.resolve(apiHealth.storage.filePath) : ''
  const exportDirectory = apiHealth.storage?.exportDirectory ? path.resolve(apiHealth.storage.exportDirectory) : ''

  checks.push(checkPathExists('sqlite-file', sqlitePath))
  checks.push(checkPathExists('export-directory', exportDirectory))
  checks.push(checkDiskSpace(sqlitePath || exportDirectory || process.cwd()))
  checks.push(checkLinuxService('nginx-service', nginxServiceName))
  checks.push(checkPm2App(pm2AppName))

  const failedChecks = checks.filter((item) => !item.ok)
  const summary = {
    status: failedChecks.length === 0 ? 'ok' : 'degraded',
    checkedAt: new Date().toISOString(),
    host: os.hostname(),
    platform: process.platform,
    checks,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (failedChecks.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
})
