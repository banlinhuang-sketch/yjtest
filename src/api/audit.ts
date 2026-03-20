import type { AuditLogEntry } from '../types.ts'
import { normalizeAuditLogListResponse } from './backendAdapter.ts'
import { apiRequest } from './client.ts'

export async function listAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const payload = await apiRequest<unknown>('/api/v1/audit-logs', {
    query: { limit },
  })
  const response = normalizeAuditLogListResponse(payload)
  return response.items
}

