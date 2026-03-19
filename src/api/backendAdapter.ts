import type { Attachment, ActivityEntry, Priority, Scope, Status, StepRow } from '../types.ts'
import type {
  ApiUser,
  CaseDetailDTO,
  CaseListResponse,
  CaseSummaryDTO,
  ExportTaskCreateResponse,
  ExportTaskStatusResponse,
  KnowledgeSourceCategory,
  KnowledgeSourceDTO,
  KnowledgeSourceListResponse,
  LoginResponse,
} from './contracts.ts'

type LooseRecord = Record<string, unknown>

export type ApiBackendMode = 'local' | 'formal'
export type ApiEnvelopeMode = 'auto' | 'flat' | 'data' | 'result' | 'payload'

const API_BACKEND_MODE: ApiBackendMode =
  import.meta.env.VITE_API_BACKEND_MODE === 'formal' ? 'formal' : 'local'

const API_ENVELOPE_MODE: ApiEnvelopeMode = (() => {
  const raw = String(import.meta.env.VITE_API_RESPONSE_ENVELOPE ?? 'auto').trim()
  if (raw === 'flat' || raw === 'data' || raw === 'result' || raw === 'payload' || raw === 'auto') {
    return raw
  }

  return 'auto'
})()

const knowledgeCategoryLabels: Record<KnowledgeSourceCategory, string> = {
  business: '业务知识',
  hardware: '硬件能力',
  flow: '交互流程',
  history: '历史缺陷',
  matrix: '兼容矩阵',
  terms: '术语基线',
}

const knowledgeCategoryIcons: Record<KnowledgeSourceCategory, string> = {
  business: 'smartphone',
  hardware: 'glasses',
  flow: 'account_tree',
  history: 'history',
  matrix: 'grid_view',
  terms: 'book_2',
}

const knowledgeCategoryAccents: Record<KnowledgeSourceCategory, string> = {
  business: 'blue',
  hardware: 'teal',
  flow: 'orange',
  history: 'slate',
  matrix: 'purple',
  terms: 'emerald',
}

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): LooseRecord | null {
  return isRecord(value) ? value : null
}

function readValue(record: LooseRecord | null, keys: string[]) {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }

  return undefined
}

function toStringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function toIsoString(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }

  return new Date().toISOString()
}

function buildFallbackId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function normalizeScope(value: unknown): Scope {
  const raw = toStringValue(value, 'app').toLowerCase()

  if (raw === 'glasses' || raw === 'hardware' || raw === 'device') {
    return 'glasses'
  }

  if (raw === 'linked' || raw === 'linkage' || raw === 'cross' || raw === 'cross-end') {
    return 'linked'
  }

  return 'app'
}

function normalizePriority(value: unknown): Priority {
  const raw = toStringValue(value, 'P1').toUpperCase()
  if (raw === 'P0' || raw === 'P1' || raw === 'P2') {
    return raw
  }

  return 'P1'
}

function normalizeStatus(value: unknown): Status {
  const raw = toStringValue(value, '草稿').toLowerCase()

  if (raw === '草稿' || raw === 'draft') {
    return '草稿'
  }

  if (raw === '待审核' || raw === 'pending' || raw === 'pending_review' || raw === 'pending-review' || raw === 'reviewing') {
    return '待审核'
  }

  if (raw === '已沉淀' || raw === 'approved' || raw === 'archived' || raw === 'published' || raw === 'processed') {
    return '已沉淀'
  }

  return '草稿'
}

function normalizeKnowledgeCategory(value: unknown): KnowledgeSourceCategory {
  const raw = toStringValue(value, 'business').toLowerCase()

  if (raw === 'hardware' || raw === 'device') {
    return 'hardware'
  }
  if (raw === 'flow' || raw === 'process') {
    return 'flow'
  }
  if (raw === 'history' || raw === 'defect') {
    return 'history'
  }
  if (raw === 'matrix' || raw === 'compatibility') {
    return 'matrix'
  }
  if (raw === 'terms' || raw === 'term') {
    return 'terms'
  }

  return 'business'
}

function normalizeRoleCode(value: unknown): NonNullable<ApiUser['roleCode']> {
  const raw = toStringValue(value, 'tester').toLowerCase()

  if (raw === 'reviewer' || raw === 'review' || raw === 'auditor' || raw.includes('审核')) {
    return 'reviewer'
  }

  if (raw === 'admin' || raw === 'administrator' || raw.includes('管理')) {
    return 'admin'
  }

  return 'tester'
}

function buildRoleLabel(roleCode: NonNullable<ApiUser['roleCode']>) {
  if (roleCode === 'reviewer') {
    return '质量门禁负责人'
  }

  if (roleCode === 'admin') {
    return '系统管理员'
  }

  return '测试设计负责人'
}

function unwrapEnvelopeByMode(payload: unknown, mode: ApiEnvelopeMode) {
  const record = asRecord(payload)
  if (!record || mode === 'flat') {
    return payload
  }

  if (mode !== 'auto') {
    return record[mode] ?? payload
  }

  const hasEnvelopeKey = ['data', 'result', 'payload'].some((key) => key in record)
  const hasEnvelopeMeta =
    'code' in record ||
    'success' in record ||
    'message' in record ||
    'msg' in record ||
    'meta' in record ||
    'errors' in record

  if (!hasEnvelopeKey) {
    return payload
  }

  if (API_BACKEND_MODE === 'formal' || hasEnvelopeMeta) {
    return record.data ?? record.result ?? record.payload ?? payload
  }

  return payload
}

export function getApiBackendMode() {
  return API_BACKEND_MODE
}

export function getApiEnvelopeMode() {
  return API_ENVELOPE_MODE
}

export function unwrapApiPayload(payload: unknown): unknown {
  let current = payload

  for (let index = 0; index < 3; index += 1) {
    const next = unwrapEnvelopeByMode(current, API_ENVELOPE_MODE)
    if (next === current) {
      break
    }
    current = next
  }

  return current
}

export function extractApiMessage(payload: unknown, fallback: string) {
  const candidates = [payload, unwrapApiPayload(payload)]

  for (const candidate of candidates) {
    const record = asRecord(candidate)
    const direct = toStringValue(readValue(record, ['message', 'msg', 'errorMessage', 'error_message', 'detail']))

    if (direct) {
      return direct
    }

    const errorValue = readValue(record, ['error'])
    const errorRecord = asRecord(errorValue)
    const nested = toStringValue(readValue(errorRecord, ['message', 'msg', 'detail']))
    if (nested) {
      return nested
    }

    const errors = toArray(readValue(record, ['errors']))
    const firstError = errors[0]
    if (typeof firstError === 'string' && firstError.trim()) {
      return firstError.trim()
    }

    const firstErrorRecord = asRecord(firstError)
    const arrayNested = toStringValue(readValue(firstErrorRecord, ['message', 'msg', 'detail']))
    if (arrayNested) {
      return arrayNested
    }
  }

  return fallback
}

function normalizeUser(value: unknown): ApiUser {
  const root = asRecord(unwrapApiPayload(value)) ?? {}
  const source = asRecord(readValue(root, ['user', 'account', 'profile', 'currentUser'])) ?? root
  const roleCode = normalizeRoleCode(readValue(source, ['roleCode', 'role_code', 'role', 'roleName', 'role_name']))
  const roleLabel = toStringValue(
    readValue(source, ['roleLabel', 'role_label', 'role', 'roleName', 'role_name']),
    buildRoleLabel(roleCode),
  )

  return {
    id: toStringValue(readValue(source, ['id', 'userId', 'user_id']), buildFallbackId('user')),
    name: toStringValue(readValue(source, ['name', 'displayName', 'display_name', 'username']), '未命名用户'),
    role: roleLabel,
    roleCode,
    roleLabel,
  }
}

export function normalizeLoginResponse(payload: unknown): LoginResponse {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}

  return {
    accessToken: toStringValue(readValue(source, ['accessToken', 'access_token', 'token']), ''),
    user: normalizeUser(source),
  }
}

export function normalizeCurrentUserResponse(payload: unknown): ApiUser {
  return normalizeUser(payload)
}

function normalizeCaseSummary(value: unknown): CaseSummaryDTO {
  const source = asRecord(value) ?? {}

  return {
    id: toStringValue(readValue(source, ['id', 'caseId', 'case_id']), buildFallbackId('case')),
    title: toStringValue(readValue(source, ['title', 'name']), '未命名用例'),
    feature: toStringValue(readValue(source, ['feature', 'module', 'featureName']), ''),
    scope: normalizeScope(readValue(source, ['scope', 'scopeType', 'domain'])),
    priority: normalizePriority(readValue(source, ['priority', 'priorityLevel', 'level'])),
    status: normalizeStatus(readValue(source, ['status', 'reviewStatus', 'state'])),
    owner: toStringValue(readValue(source, ['owner', 'ownerName', 'owner_name']), ''),
    submitter: toStringValue(
      readValue(source, ['submitter', 'submitterName', 'creator', 'createdBy', 'created_by']),
      '',
    ),
    tags: toStringArray(readValue(source, ['tags', 'tagList', 'labels'])),
    updatedAt: toIsoString(readValue(source, ['updatedAt', 'updated_at', 'updateTime', 'updatedTime'])),
  }
}

function normalizeAttachment(value: unknown): Attachment {
  const source = asRecord(value) ?? {}

  return {
    name: toStringValue(readValue(source, ['name', 'fileName', 'filename']), '附件'),
    kind: (toStringValue(readValue(source, ['kind', 'type']), 'doc') as Attachment['kind']) || 'doc',
  }
}

function normalizeActivityEntry(value: unknown): ActivityEntry {
  const source = asRecord(value) ?? {}
  const toneRaw = toStringValue(readValue(source, ['tone', 'variant']), 'neutral')
  const tone: ActivityEntry['tone'] = toneRaw === 'primary' || toneRaw === 'positive' ? toneRaw : 'neutral'

  return {
    time: toStringValue(readValue(source, ['time', 'timestamp', 'createdAt']), ''),
    detail: toStringValue(readValue(source, ['detail', 'content', 'message']), ''),
    tone,
  }
}

function normalizeStepRow(value: unknown): StepRow {
  const source = asRecord(value) ?? {}

  return {
    action: toStringValue(readValue(source, ['action', 'step', 'content', 'description']), ''),
    expected: toStringValue(readValue(source, ['expected', 'result', 'expectation']), ''),
    evidence: toStringValue(readValue(source, ['evidence', 'proof', 'artifact']), ''),
  }
}

export function normalizeCaseListResponse(payload: unknown): CaseListResponse {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}
  const items = toArray(readValue(source, ['items', 'records', 'list', 'rows']))

  return {
    items: items.map(normalizeCaseSummary),
    total: Number(readValue(source, ['total', 'count', 'totalCount', 'total_count']) ?? items.length) || items.length,
  }
}

export function normalizeCaseDetailResponse(payload: unknown): CaseDetailDTO {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}
  const summary = normalizeCaseSummary(source)
  const preconditionsRaw = readValue(source, ['preconditions', 'preconditionList'])
  const preconditions = toArray(preconditionsRaw).length
    ? toArray(preconditionsRaw).map((item) => (typeof item === 'string' ? item : toStringValue(asRecord(item)?.content, '')))
    : []

  return {
    ...summary,
    objective: toStringValue(readValue(source, ['objective', 'goal']), ''),
    notes: toStringValue(readValue(source, ['notes', 'remark', 'description']), ''),
    preconditions: preconditions.filter(Boolean),
    steps: toArray(readValue(source, ['steps', 'stepList'])).map(normalizeStepRow),
    attachments: toArray(readValue(source, ['attachments', 'files'])).map(normalizeAttachment),
    activity: toArray(readValue(source, ['activity', 'activityLog', 'history'])).map(normalizeActivityEntry),
    reviewNote: toStringValue(readValue(source, ['reviewNote', 'review_note', 'auditNote']), ''),
  }
}

function normalizeTaskStatus(value: unknown): ExportTaskStatusResponse['status'] {
  const raw = toStringValue(value, 'pending').toLowerCase()

  if (raw === 'processing' || raw === 'running') {
    return 'processing'
  }

  if (raw === 'completed' || raw === 'success' || raw === 'done') {
    return 'completed'
  }

  if (raw === 'failed' || raw === 'error') {
    return 'failed'
  }

  return 'pending'
}

export function normalizeExportTaskCreateResponse(payload: unknown): ExportTaskCreateResponse {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}

  return {
    taskId: toStringValue(readValue(source, ['taskId', 'task_id', 'id']), buildFallbackId('export')),
    status: 'pending',
  }
}

export function normalizeExportTaskStatusResponse(payload: unknown): ExportTaskStatusResponse {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}

  return {
    taskId: toStringValue(readValue(source, ['taskId', 'task_id', 'id']), buildFallbackId('export')),
    status: normalizeTaskStatus(readValue(source, ['status', 'taskStatus'])),
    fileName: toStringValue(readValue(source, ['fileName', 'file_name']), ''),
    downloadUrl: toStringValue(readValue(source, ['downloadUrl', 'download_url', 'fileUrl', 'url']), ''),
    errorMessage: toStringValue(readValue(source, ['errorMessage', 'error_message', 'message']), ''),
  }
}

function normalizeKnowledgeSource(value: unknown): KnowledgeSourceDTO {
  const source = asRecord(value) ?? {}
  const category = normalizeKnowledgeCategory(readValue(source, ['category', 'type']))

  return {
    id: toStringValue(readValue(source, ['id']), buildFallbackId('knowledge')),
    title: toStringValue(readValue(source, ['title', 'name']), '未命名知识源'),
    category,
    categoryLabel: toStringValue(readValue(source, ['categoryLabel', 'category_label']), knowledgeCategoryLabels[category]),
    summary: toStringValue(readValue(source, ['summary', 'description']), ''),
    updatedAt: toIsoString(readValue(source, ['updatedAt', 'updated_at', 'lastUpdatedAt'])).slice(0, 10),
    icon: toStringValue(readValue(source, ['icon']), knowledgeCategoryIcons[category]),
    accent: toStringValue(readValue(source, ['accent']), knowledgeCategoryAccents[category]),
  }
}

export function normalizeKnowledgeSourceListResponse(payload: unknown): KnowledgeSourceListResponse {
  const source = asRecord(unwrapApiPayload(payload)) ?? {}
  const items = toArray(readValue(source, ['items', 'records', 'list', 'rows']))

  return {
    items: items.map(normalizeKnowledgeSource),
    total: Number(readValue(source, ['total', 'count', 'totalCount', 'total_count']) ?? items.length) || items.length,
  }
}
