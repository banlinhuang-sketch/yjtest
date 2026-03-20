const baseUrl = (process.env.FORMAL_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
const username = (process.env.FORMAL_API_USERNAME ?? '').trim()
const password = process.env.FORMAL_API_PASSWORD ?? ''
const adminUsername = (process.env.FORMAL_API_ADMIN_USERNAME ?? '').trim()
const adminPassword = process.env.FORMAL_API_ADMIN_PASSWORD ?? ''
const timeoutMs = Number.parseInt(process.env.FORMAL_API_TIMEOUT_MS ?? '12000', 10)

function fail(message) {
  console.error(`[formal-smoke] ${message}`)
  process.exit(1)
}

if (!baseUrl || !username || !password) {
  fail('Please set FORMAL_API_BASE_URL, FORMAL_API_USERNAME, and FORMAL_API_PASSWORD before running this smoke test.')
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function unwrapPayload(payload) {
  const record = asRecord(payload)
  if (!record) {
    return payload
  }

  const candidates = ['data', 'result', 'payload']
  for (const key of candidates) {
    if (key in record) {
      return record[key]
    }
  }

  return payload
}

function readMessage(payload, fallback) {
  const record = asRecord(payload)
  if (!record) {
    return fallback
  }

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim()
  }

  const nested = asRecord(record.error)
  if (nested && typeof nested.message === 'string' && nested.message.trim()) {
    return nested.message.trim()
  }

  return fallback
}

async function request(path, { method = 'GET', token = '', body } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 12000)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    const raw = await response.text()
    let payload = null
    if (raw) {
      try {
        payload = JSON.parse(raw)
      } catch {
        payload = { message: raw }
      }
    }

    if (!response.ok) {
      throw new Error(`${response.status} ${readMessage(payload, 'Request failed')}`)
    }

    return unwrapPayload(payload)
  } finally {
    clearTimeout(timer)
  }
}

async function login(account, secret) {
  const payload = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      username: account,
      password: secret,
    },
  })

  const record = asRecord(payload)
  const token =
    (typeof record?.accessToken === 'string' && record.accessToken) ||
    (typeof record?.access_token === 'string' && record.access_token) ||
    (typeof record?.token === 'string' && record.token) ||
    ''

  if (!token) {
    throw new Error('Login response did not contain a usable token.')
  }

  return {
    token,
    user: asRecord(record?.user) ?? {},
  }
}

async function run() {
  console.log(`[formal-smoke] base URL: ${baseUrl}`)

  const { token, user } = await login(username, password)
  console.log(`[formal-smoke] login ok as ${user.name ?? username}`)

  const me = await request('/api/v1/auth/me', { token })
  console.log(`[formal-smoke] auth/me ok: ${JSON.stringify(me)}`)

  const caseList = await request('/api/v1/cases?page=1&pageSize=5', { token })
  const caseItems =
    (Array.isArray(caseList?.items) && caseList.items) ||
    (Array.isArray(caseList?.records) && caseList.records) ||
    (Array.isArray(caseList?.list) && caseList.list) ||
    (Array.isArray(caseList?.rows) && caseList.rows) ||
    []
  console.log(`[formal-smoke] list cases ok: ${caseItems.length} item(s) on first page`)

  if (caseItems[0]?.id) {
    const detail = await request(`/api/v1/cases/${caseItems[0].id}`, { token })
    console.log(`[formal-smoke] case detail ok: ${caseItems[0].id} (${detail?.title ?? 'untitled'})`)
  }

  try {
    const knowledge = await request('/api/v1/knowledge/sources', { token })
    const knowledgeItems =
      (Array.isArray(knowledge?.items) && knowledge.items) ||
      (Array.isArray(knowledge?.list) && knowledge.list) ||
      (Array.isArray(knowledge?.sources) && knowledge.sources) ||
      (Array.isArray(knowledge) ? knowledge : [])
    console.log(`[formal-smoke] knowledge sources ok: ${knowledgeItems.length} source(s)`)
  } catch (error) {
    console.warn(`[formal-smoke] knowledge source check skipped/failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (adminUsername && adminPassword) {
    try {
      const admin = await login(adminUsername, adminPassword)
      const logs = await request('/api/v1/audit-logs?limit=5', { token: admin.token })
      const logItems = Array.isArray(logs) ? logs : Array.isArray(logs?.items) ? logs.items : []
      console.log(`[formal-smoke] audit logs ok: ${logItems.length} row(s)`)
    } catch (error) {
      console.warn(`[formal-smoke] admin audit check skipped/failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('[formal-smoke] completed successfully')
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
