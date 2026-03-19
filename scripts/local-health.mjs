const webOrigin = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:4177'
const apiOrigin = process.env.API_BASE_URL ?? 'http://127.0.0.1:8787'

async function checkText(url, label) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label} responded with ${response.status}`)
  }

  const text = await response.text()
  if (!text || (!text.includes('<!doctype html') && !text.includes('<!DOCTYPE html'))) {
    throw new Error(`${label} did not return the app shell`)
  }
}

async function checkJson(url, label) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label} responded with ${response.status}`)
  }

  return response.json()
}

async function main() {
  console.log('[health] checking web shell')
  await checkText(webOrigin, 'Web app')

  console.log('[health] checking api health endpoint')
  const apiHealth = await checkJson(`${apiOrigin.replace(/\/+$/, '')}/api/v1/health`, 'API health')
  if (apiHealth.status !== 'ok') {
    throw new Error('API health status is not ok')
  }

  console.log('[health] local services are ready')
}

main().catch((error) => {
  console.error('[health] failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
