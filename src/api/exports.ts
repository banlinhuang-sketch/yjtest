import {
  normalizeExportTaskCreateResponse,
  normalizeExportTaskStatusResponse,
} from './backendAdapter.ts'
import { ApiError, apiRequest, getStoredToken, resolveApiUrl } from './client.ts'
import { buildExportTaskPayload, getApiRoute } from './requestAdapter.ts'

export async function createExportTask(input: {
  format: 'excel' | 'word'
  filters: {
    keyword: string
    scope: string
    status: string
    priority: string
    timeRange: string
    tag: string
  }
}) {
  const payload = await apiRequest<unknown>(getApiRoute('exportsCreate'), {
    method: 'POST',
    body: buildExportTaskPayload(input),
  })

  return normalizeExportTaskCreateResponse(payload)
}

export async function getExportTask(taskId: string) {
  const payload = await apiRequest<unknown>(getApiRoute('exportTask', { id: taskId }))
  const task = normalizeExportTaskStatusResponse(payload)

  return {
    ...task,
    downloadUrl: task.downloadUrl ? resolveApiUrl(task.downloadUrl) : undefined,
  }
}

export async function waitForExportTask(taskId: string) {
  const maxAttempts = 20

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const task = await getExportTask(taskId)
    if (task.status === 'completed' || task.status === 'failed') {
      return task
    }

    await new Promise((resolve) => window.setTimeout(resolve, 450))
  }

  throw new Error('导出任务轮询超时。')
}

export async function downloadExportFile(downloadUrl: string, suggestedFileName?: string) {
  const token = getStoredToken()
  const response = await fetch(resolveApiUrl(downloadUrl), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (!response.ok) {
    let message = '导出文件下载失败，请稍后重试。'

    try {
      const payload = (await response.json()) as { message?: string; error?: { message?: string } }
      message = payload?.message || payload?.error?.message || message
    } catch {
      // Ignore parse errors and fall back to the default message.
    }

    throw new ApiError(message, response.status, 'EXPORT_DOWNLOAD_FAILED')
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  if (suggestedFileName) {
    anchor.download = suggestedFileName
  }
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
