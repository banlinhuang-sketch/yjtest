import {
  normalizeExportTaskCreateResponse,
  normalizeExportTaskStatusResponse,
} from './backendAdapter.ts'
import { apiRequest, resolveApiUrl } from './client.ts'

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
  const payload = await apiRequest<unknown>('/api/v1/exports', {
    method: 'POST',
    body: input,
  })

  return normalizeExportTaskCreateResponse(payload)
}

export async function getExportTask(taskId: string) {
  const payload = await apiRequest<unknown>(`/api/v1/exports/${encodeURIComponent(taskId)}`)
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
