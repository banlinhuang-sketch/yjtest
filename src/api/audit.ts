import type { AuditLogEntry } from '../types.ts'
import { normalizeAuditLogListResponse } from './backendAdapter.ts'
import { apiRequest } from './client.ts'
import { buildAuditLogListQuery, getApiRoute } from './requestAdapter.ts'

export async function listAuditLogs(limit = 200): Promise<AuditLogEntry[]> {
  const payload = await apiRequest<unknown>(getApiRoute('auditLogs'), {
    query: buildAuditLogListQuery(limit),
  })
  const response = normalizeAuditLogListResponse(payload)
  return response.items
}
