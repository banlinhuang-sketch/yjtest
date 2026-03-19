import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import {
  getDatabaseMeta,
  getStoredCaseById,
  getStoredExportRecordByTaskId,
  getStoredUserById,
  getStoredUserByUsername,
  insertStoredAuditLog,
  listStoredAuditLogs,
  listStoredCases,
  listStoredExportRecords,
  listStoredKnowledgeSources,
  saveStoredCase,
  upsertStoredExportRecord,
  verifyPasswordHash,
} from './database.mjs'
import { createGeneratedDraftCase } from './seed-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const exportRootDir = path.resolve(process.env.API_EXPORT_DIR || path.join(__dirname, 'exports'))

const sessions = new Map()
const exportTasks = new Map()

const REVIEWABLE_ROLE_CODES = new Set(['reviewer', 'admin'])

fs.mkdirSync(exportRootDir, { recursive: true })

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizePublicUser(storedUser) {
  if (!storedUser) {
    return null
  }

  return {
    id: storedUser.id,
    name: storedUser.name,
    role: storedUser.roleLabel,
    roleCode: storedUser.roleCode,
    roleLabel: storedUser.roleLabel,
  }
}

function canReviewCases(user) {
  return Boolean(user?.roleCode && REVIEWABLE_ROLE_CODES.has(user.roleCode))
}

function assertCanReview(user) {
  if (canReviewCases(user)) {
    return
  }

  const error = new Error('当前账号没有审核权限，请切换审核人或管理员账号。')
  error.statusCode = 403
  error.errorCode = 'AUTH_FORBIDDEN'
  throw error
}

function writeAuditLog({ actor, action, targetType, targetId, targetTitle, detail, metadata = {} }) {
  if (!actor?.id) {
    return null
  }

  return insertStoredAuditLog({
    id: randomUUID(),
    actorId: actor.id,
    actorName: actor.name,
    actorRoleCode: actor.roleCode ?? 'unknown',
    actorRoleLabel: actor.roleLabel ?? actor.role ?? actor.roleCode ?? 'unknown',
    action,
    targetType,
    targetId,
    targetTitle,
    detail,
    metadata,
    createdAt: new Date().toISOString(),
  })
}

function buildSummary(caseItem) {
  return {
    id: caseItem.id,
    title: caseItem.title,
    feature: caseItem.feature,
    scope: caseItem.scope,
    priority: caseItem.priority,
    status: caseItem.status,
    owner: caseItem.owner,
    submitter: caseItem.submitter,
    tags: [...caseItem.tags],
    updatedAt: caseItem.updatedAt,
  }
}

function buildDetail(caseItem) {
  return {
    ...buildSummary(caseItem),
    objective: caseItem.objective,
    notes: caseItem.notes,
    preconditions: [...caseItem.preconditions],
    steps: caseItem.steps.map((step) => ({ ...step })),
    attachments: caseItem.attachments.map((attachment) => ({ ...attachment })),
    activity: caseItem.activity.map((entry) => ({ ...entry })),
    reviewNote: caseItem.reviewNote,
  }
}

function nowActivity(detail, tone = 'primary') {
  return {
    time: new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date()),
    detail,
    tone,
  }
}

function touchCase(caseItem, detail, tone = 'primary') {
  return {
    ...caseItem,
    updatedAt: new Date().toISOString(),
    activity: [nowActivity(detail, tone), ...caseItem.activity].slice(0, 8),
  }
}

function sanitizeDetailPayload(payload, fallback = null) {
  return {
    id:
      typeof payload.id === 'string' && payload.id.trim()
        ? payload.id.trim()
        : fallback?.id ?? `TC-CUSTOM-${randomUUID().slice(0, 8).toUpperCase()}`,
    title:
      typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : fallback?.title ?? '未命名用例',
    feature:
      typeof payload.feature === 'string' && payload.feature.trim()
        ? payload.feature.trim()
        : fallback?.feature ?? '待补充模块',
    scope: ['app', 'glasses', 'linked'].includes(payload.scope) ? payload.scope : fallback?.scope ?? 'app',
    priority: ['P0', 'P1', 'P2'].includes(payload.priority) ? payload.priority : fallback?.priority ?? 'P1',
    status: ['草稿', '待审核', '已沉淀'].includes(payload.status) ? payload.status : fallback?.status ?? '草稿',
    owner:
      typeof payload.owner === 'string' && payload.owner.trim()
        ? payload.owner.trim()
        : fallback?.owner ?? '待分配',
    submitter:
      typeof payload.submitter === 'string' && payload.submitter.trim()
        ? payload.submitter.trim()
        : fallback?.submitter ?? '系统提交',
    objective: typeof payload.objective === 'string' ? payload.objective : fallback?.objective ?? '',
    notes: typeof payload.notes === 'string' ? payload.notes : fallback?.notes ?? '',
    tags: Array.isArray(payload.tags) ? payload.tags.filter((item) => typeof item === 'string') : fallback?.tags ?? [],
    preconditions: Array.isArray(payload.preconditions)
      ? payload.preconditions.filter((item) => typeof item === 'string')
      : fallback?.preconditions ?? [],
    steps: Array.isArray(payload.steps)
      ? payload.steps
          .map((step) => ({
            action: typeof step?.action === 'string' ? step.action : '',
            expected: typeof step?.expected === 'string' ? step.expected : '',
            evidence: typeof step?.evidence === 'string' ? step.evidence : '',
          }))
          .filter(
            (step) =>
              step.action.trim().length > 0 ||
              step.expected.trim().length > 0 ||
              step.evidence.trim().length > 0,
          )
      : fallback?.steps ?? [],
    attachments: Array.isArray(payload.attachments)
      ? payload.attachments
          .map((attachment) => ({
            name: typeof attachment?.name === 'string' ? attachment.name : '',
            kind: ['image', 'doc', 'video', 'log'].includes(attachment?.kind) ? attachment.kind : 'doc',
          }))
          .filter((attachment) => attachment.name.trim().length > 0)
      : fallback?.attachments ?? [],
    activity: fallback?.activity ?? [],
    reviewNote: typeof payload.reviewNote === 'string' ? payload.reviewNote : fallback?.reviewNote ?? '',
    updatedAt: fallback?.updatedAt ?? new Date().toISOString(),
  }
}

function applyFilters(sourceCases, filters) {
  const keyword = (filters.keyword ?? '').trim().toLowerCase()
  const submitter = filters.submitter && filters.submitter !== 'all' ? filters.submitter : ''
  const scope = filters.scope && filters.scope !== 'all' ? filters.scope : ''
  const status = filters.status && filters.status !== 'all' ? filters.status : ''
  const priority = filters.priority && filters.priority !== 'all' ? filters.priority : ''
  const tag = filters.tag && filters.tag !== 'all' ? filters.tag : ''
  const updatedFrom = filters.updatedFrom ? Date.parse(filters.updatedFrom) : null
  const updatedTo = filters.updatedTo ? Date.parse(filters.updatedTo) : null
  const timeRangeMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }

  return sourceCases.filter((item) => {
    if (scope && item.scope !== scope) {
      return false
    }

    if (status && item.status !== status) {
      return false
    }

    if (priority && item.priority !== priority) {
      return false
    }

    if (submitter && item.submitter !== submitter) {
      return false
    }

    if (tag && !item.tags.includes(tag)) {
      return false
    }

    const updatedAt = Date.parse(item.updatedAt)
    if (updatedFrom && updatedAt < updatedFrom) {
      return false
    }
    if (updatedTo && updatedAt > updatedTo) {
      return false
    }
    if (filters.timeRange && filters.timeRange !== 'all') {
      const days = timeRangeMap[filters.timeRange]
      if (days && Date.now() - updatedAt > days * 24 * 60 * 60 * 1000) {
        return false
      }
    }

    if (!keyword) {
      return true
    }

    const haystack = [
      item.id,
      item.title,
      item.feature,
      item.owner,
      item.submitter,
      item.objective,
      item.notes,
      ...item.tags,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(keyword)
  })
}

function sortCases(sourceCases) {
  return [...sourceCases].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}

function buildExportTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '_')
}

function buildExportFileName(format) {
  return `导出用例_${buildExportTimestamp()}.${format === 'excel' ? 'xlsx' : 'docx'}`
}

function createExportRecord(task) {
  return {
    id: task.id,
    taskId: task.taskId,
    actorId: task.actorId,
    actorName: task.actorName,
    actorRoleCode: task.actorRoleCode,
    format: task.format,
    fileName: task.fileName,
    filePath: task.filePath,
    status: task.status,
    filters: task.filters,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
  }
}

function persistExportRecord(task) {
  upsertStoredExportRecord(createExportRecord(task))
}

function buildExportContent(format, exportCases) {
  if (format === 'excel') {
    const header = ['ID', '标题', '范围', '状态', '优先级', '标签', '负责人', '更新时间']
    const rows = exportCases.map((item) =>
      [
        item.id,
        item.title,
        item.scope,
        item.status,
        item.priority,
        item.tags.join(' / '),
        item.owner,
        item.updatedAt,
      ].join('\t'),
    )

    return `\uFEFF${[header.join('\t'), ...rows].join('\n')}`
  }

  return exportCases
    .map(
      (item, index) => `# ${index + 1}. ${item.title}

- ID: ${item.id}
- 范围: ${item.scope}
- 状态: ${item.status}
- 优先级: ${item.priority}
- 标签: ${item.tags.join(' / ')}
- 负责人: ${item.owner}
- 更新时间: ${item.updatedAt}

## 测试目标
${item.objective}

## 前置条件
${item.preconditions.map((entry, entryIndex) => `${entryIndex + 1}. ${entry}`).join('\n')}
`,
    )
    .join('\n---\n')
}

function createExportTaskRecord({ format, filters, currentUser }) {
  const taskId = randomUUID()
  const exportCases = applyFilters(sortCases(listStoredCases()), filters)
  const createdAt = new Date().toISOString()
  const task = {
    id: randomUUID(),
    taskId,
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRoleCode: currentUser.roleCode ?? 'tester',
    status: 'pending',
    format,
    filters,
    fileName: buildExportFileName(format),
    filePath: '',
    errorMessage: '',
    createdAt,
    updatedAt: createdAt,
    completedAt: '',
  }

  task.filePath = path.join(exportRootDir, task.fileName)
  exportTasks.set(taskId, task)
  persistExportRecord(task)

  setTimeout(() => {
    const current = exportTasks.get(taskId)
    if (!current) {
      return
    }

    current.status = 'processing'
    current.updatedAt = new Date().toISOString()
    persistExportRecord(current)
  }, 350)

  setTimeout(() => {
    const current = exportTasks.get(taskId)
    if (!current) {
      return
    }

    if (exportCases.length === 0) {
      current.status = 'failed'
      current.errorMessage = '无匹配的导出数据，请调整筛选条件。'
      current.updatedAt = new Date().toISOString()
      persistExportRecord(current)
      return
    }

    if (format === 'word' && exportCases.length > 12) {
      current.status = 'failed'
      current.errorMessage = 'Word 导出批量过大，请缩小筛选范围或切换 Excel。'
      current.updatedAt = new Date().toISOString()
      persistExportRecord(current)
      return
    }

    current.status = 'completed'
    current.updatedAt = new Date().toISOString()
    current.completedAt = current.updatedAt
    fs.writeFileSync(current.filePath, buildExportContent(format, exportCases), 'utf8')
    persistExportRecord(current)
  }, 1800)

  return task
}

export function login(username, password) {
  const targetUser = getStoredUserByUsername(typeof username === 'string' ? username.trim() : '')

  if (!targetUser || targetUser.status !== 'active' || !verifyPasswordHash(password, targetUser.passwordHash)) {
    return null
  }

  const accessToken = randomUUID()
  sessions.set(accessToken, targetUser.id)
  writeAuditLog({
    actor: normalizePublicUser(targetUser),
    action: 'auth.login',
    targetType: 'auth',
    targetId: targetUser.id,
    targetTitle: targetUser.username,
    detail: 'User signed in successfully.',
    metadata: {
      username: targetUser.username,
      status: 'success',
    },
  })

  return {
    accessToken,
    user: normalizePublicUser(targetUser),
  }
}

export function getUserByToken(token) {
  const userId = sessions.get(token)
  if (!userId) {
    return null
  }

  const targetUser = getStoredUserById(userId)
  if (!targetUser || targetUser.status !== 'active') {
    sessions.delete(token)
    return null
  }

  return normalizePublicUser(targetUser)
}

export function listCases(filters = {}) {
  const page = Math.max(Number.parseInt(filters.page ?? '1', 10) || 1, 1)
  const pageSize = Math.max(Number.parseInt(filters.pageSize ?? '200', 10) || 200, 1)
  const filteredCases = applyFilters(sortCases(listStoredCases()), filters)
  const start = (page - 1) * pageSize
  const items = filteredCases.slice(start, start + pageSize).map(buildSummary)

  return {
    items: clone(items),
    total: filteredCases.length,
  }
}

export function getCaseDetail(caseId) {
  const targetCase = getStoredCaseById(caseId)
  return targetCase ? clone(buildDetail(targetCase)) : null
}

export function createCase(payload, currentUser) {
  const nextCase = touchCase(
    sanitizeDetailPayload(payload, null),
    `${currentUser.name} 新建了一条用例。`,
  )
  nextCase.submitter = payload.submitter || currentUser.name
  const saved = saveStoredCase(nextCase)
  writeAuditLog({
    actor: currentUser,
    action: 'case.create',
    targetType: 'case',
    targetId: saved.id,
    targetTitle: saved.title,
    detail: 'Created a test case.',
    metadata: {
      scope: saved.scope,
      status: saved.status,
      priority: saved.priority,
      source: 'manual',
    },
  })
  return clone(buildDetail(saved))
}

export function updateCase(caseId, payload, currentUser) {
  const fallback = getStoredCaseById(caseId)
  if (!fallback) {
    return null
  }

  const nextCase = touchCase(
    sanitizeDetailPayload(payload, fallback),
    `${currentUser.name} 保存了用例更新。`,
  )
  const saved = saveStoredCase(nextCase)
  writeAuditLog({
    actor: currentUser,
    action: 'case.update',
    targetType: 'case',
    targetId: saved.id,
    targetTitle: saved.title,
    detail: 'Updated a test case.',
    metadata: {
      scope: saved.scope,
      status: saved.status,
      priority: saved.priority,
    },
  })
  return clone(buildDetail(saved))
}

export function generateDraft(payload, currentUser) {
  const scope = ['app', 'glasses', 'linked'].includes(payload.scope) ? payload.scope : 'app'
  const nextCase = createGeneratedDraftCase({
    scope,
    title: typeof payload.title === 'string' ? payload.title : '',
    requirement: typeof payload.requirement === 'string' ? payload.requirement : '',
    submitter: currentUser.name,
  })

  const saved = saveStoredCase(nextCase)
  writeAuditLog({
    actor: currentUser,
    action: 'case.generate_draft',
    targetType: 'case',
    targetId: saved.id,
    targetTitle: saved.title,
    detail: 'Generated a draft case from requirement input.',
    metadata: {
      scope: saved.scope,
      status: saved.status,
      requirementLength: String(payload.requirement ?? '').trim().length,
    },
  })
  return clone(buildDetail(saved))
}

export function reviewCase(caseId, payload, currentUser) {
  assertCanReview(currentUser)

  const targetCase = getStoredCaseById(caseId)
  if (!targetCase) {
    return null
  }

  const reviewNote = typeof payload.reviewNote === 'string' ? payload.reviewNote : ''

  if (payload.action === 'reject' && reviewNote.trim().length === 0) {
    const error = new Error('退回草稿必须填写审核意见。')
    error.statusCode = 422
    error.errorCode = 'CASE_REVIEW_NOTE_REQUIRED'
    throw error
  }

  const nextStatus = payload.action === 'approve' ? '已沉淀' : '草稿'
  const nextCase = touchCase(
    {
      ...targetCase,
      status: nextStatus,
      reviewNote,
    },
    payload.action === 'approve'
      ? `${currentUser.name} 审核通过了该用例。`
      : `${currentUser.name} 将该用例退回为草稿。`,
    payload.action === 'approve' ? 'positive' : 'primary',
  )

  const saved = saveStoredCase(nextCase)
  writeAuditLog({
    actor: currentUser,
    action: payload.action === 'approve' ? 'case.review.approve' : 'case.review.reject',
    targetType: 'case',
    targetId: saved.id,
    targetTitle: saved.title,
    detail:
      payload.action === 'approve'
        ? 'Approved a pending case.'
        : 'Rejected a pending case back to draft.',
    metadata: {
      nextStatus: saved.status,
      reviewNote,
    },
  })
  return clone(buildDetail(saved))
}

export function createExportTask(payload, currentUser) {
  const format = payload.format === 'word' ? 'word' : 'excel'
  const filters = payload.filters && typeof payload.filters === 'object' ? payload.filters : {}
  const task = createExportTaskRecord({ format, filters, currentUser })
  writeAuditLog({
    actor: currentUser,
    action: 'export.create',
    targetType: 'export',
    targetId: task.taskId,
    targetTitle: task.fileName,
    detail: 'Created an export task.',
    metadata: {
      format,
      filters,
    },
  })

  return {
    taskId: task.taskId,
    status: task.status,
  }
}

export function getExportTask(taskId) {
  const task = exportTasks.get(taskId) ?? getStoredExportRecordByTaskId(taskId)
  if (!task) {
    return null
  }

  return clone({
    taskId: task.taskId,
    status: task.status,
    fileName: task.status === 'completed' ? task.fileName : undefined,
    downloadUrl: task.status === 'completed' ? `/api/v1/exports/${task.taskId}/download` : undefined,
    errorMessage: task.status === 'failed' ? task.errorMessage : undefined,
  })
}

export function getExportTaskDownload(taskId) {
  const task = exportTasks.get(taskId) ?? getStoredExportRecordByTaskId(taskId)
  if (!task || task.status !== 'completed') {
    return null
  }

  if (!task.filePath || !fs.existsSync(task.filePath)) {
    return null
  }

  return {
    fileName: task.fileName,
    content: fs.readFileSync(task.filePath),
    contentType:
      task.format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8',
  }
}

export function listKnowledgeSources() {
  const items = listStoredKnowledgeSources()
  return {
    items: clone(items),
    total: items.length,
  }
}

export function listAuditLogs(limit = 200) {
  const items = listStoredAuditLogs(limit)
  return {
    items: clone(items),
    total: Number(getDatabaseMeta().auditLogs ?? items.length),
  }
}

export function listExportHistory(currentUser, limit = 50) {
  const canReadAll = currentUser?.roleCode === 'admin'
  const items = listStoredExportRecords({
    limit,
    actorId: canReadAll ? '' : currentUser?.id ?? '',
  })

  return {
    items: clone(
      items.map((item) => ({
        taskId: item.taskId,
        actorId: item.actorId,
        actorName: item.actorName,
        actorRoleCode: item.actorRoleCode,
        format: item.format,
        fileName: item.fileName,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        completedAt: item.completedAt,
        errorMessage: item.errorMessage,
        downloadUrl: item.status === 'completed' ? `/api/v1/exports/${item.taskId}/download` : undefined,
      })),
    ),
    total: items.length,
  }
}

export function getStorageStatus() {
  return {
    ...getDatabaseMeta(),
    exportDirectory: exportRootDir,
  }
}
