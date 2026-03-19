const apiOrigin = process.env.API_BASE_URL ?? 'http://127.0.0.1:8787'
const apiBase = `${apiOrigin.replace(/\/+$/, '')}/api/v1`

function logStep(message) {
  console.log(`[smoke] ${message}`)
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const text = await response.text()
  let payload = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message
        : `Request failed: ${response.status}`
    throw new Error(String(message))
  }

  return payload
}

async function requestExpectError(path, expectedStatus, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus}, received ${response.status}`)
  }

  return payload
}

async function waitForExport(taskId, token) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const task = await request(`/exports/${encodeURIComponent(taskId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (task.status === 'completed' || task.status === 'failed') {
      return task
    }

    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  throw new Error('Export task timed out')
}

async function loginAs(username, password) {
  const loginResult = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  if (!loginResult.accessToken) {
    throw new Error(`Missing access token for ${username}`)
  }

  return loginResult.accessToken
}

async function main() {
  logStep('login as tester')
  const testerToken = await loginAs('banlin.huang', 'Yijing@2026')

  logStep('auth/me as tester')
  await request('/auth/me', {
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
  })

  logStep('list cases')
  const cases = await request('/cases?page=1&pageSize=20', {
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
  })

  if (!Array.isArray(cases.items) || cases.items.length === 0) {
    throw new Error('Cases list is empty')
  }

  logStep('generate draft')
  const draft = await request('/cases/generate-draft', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
    body: JSON.stringify({
      scope: 'linked',
      title: 'Smoke 回归草案生成',
      requirement: '验证烟雾脚本下的真实草案生成链路。',
    }),
  })

  logStep('save case')
  await request(`/cases/${encodeURIComponent(draft.id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
    body: JSON.stringify({
      ...draft,
      notes: `${draft.notes}\n[smoke] validated`,
    }),
  })

  logStep('login as reviewer')
  const reviewerToken = await loginAs('review.expert', 'Review@2026')

  logStep('ensure tester cannot review')
  const forbiddenReview = await requestExpectError(`/cases/${encodeURIComponent(draft.id)}/review`, 403, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
    body: JSON.stringify({
      action: 'approve',
      reviewNote: 'tester should not review',
    }),
  })

  if (forbiddenReview?.code !== 'AUTH_FORBIDDEN') {
    throw new Error(`Expected AUTH_FORBIDDEN, received ${forbiddenReview?.code ?? 'unknown'}`)
  }

  logStep('review case')
  await request(`/cases/${encodeURIComponent(draft.id)}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
    },
    body: JSON.stringify({
      action: 'approve',
      reviewNote: 'Smoke script auto-approved',
    }),
  })

  logStep('knowledge sources')
  const knowledge = await request('/knowledge/sources', {
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
  })

  if (!Array.isArray(knowledge.items)) {
    throw new Error('Knowledge sources response is invalid')
  }

  logStep('create export task')
  const createdTask = await request('/exports', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
    body: JSON.stringify({
      format: 'excel',
      filters: {
        keyword: '',
        scope: 'all',
        status: 'all',
        priority: 'all',
        timeRange: 'all',
        tag: 'all',
      },
    }),
  })

  const task = await waitForExport(createdTask.taskId, testerToken)
  if (task.status !== 'completed') {
    throw new Error(task.errorMessage ?? 'Export task did not complete')
  }

  logStep('download export')
  const downloadUrl = new URL(task.downloadUrl, apiOrigin).toString()
  const downloadResponse = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
  })

  if (!downloadResponse.ok) {
    throw new Error(`Download failed with status ${downloadResponse.status}`)
  }

  logStep('check export history')
  const exportHistory = await request('/exports/history?limit=10', {
    headers: {
      Authorization: `Bearer ${testerToken}`,
    },
  })

  if (!Array.isArray(exportHistory.items) || exportHistory.items.length === 0) {
    throw new Error('Export history response is empty')
  }

  if (!exportHistory.items.some((item) => item.taskId === createdTask.taskId && item.status === 'completed')) {
    throw new Error(`Export history missing completed task ${createdTask.taskId}`)
  }

  logStep('login as admin')
  const adminToken = await loginAs('admin.root', 'Admin@2026')

  logStep('list audit logs')
  const auditLogs = await request('/audit-logs?limit=20', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })

  if (!Array.isArray(auditLogs.items) || auditLogs.items.length === 0) {
    throw new Error('Audit logs response is empty')
  }

  const actions = new Set(auditLogs.items.map((entry) => entry.action))
  const expectedActions = ['auth.login', 'case.generate_draft', 'case.review.approve', 'export.create']
  for (const action of expectedActions) {
    if (!actions.has(action)) {
      throw new Error(`Missing audit action: ${action}`)
    }
  }

  logStep('smoke test passed')
}

main().catch((error) => {
  console.error('[smoke] failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
