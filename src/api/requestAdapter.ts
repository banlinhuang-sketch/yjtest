import type { TestCase } from '../types.ts'
import { testCaseToCaseDetailPayload } from './caseAdapters.ts'

type RouteKey =
  | 'authLogin'
  | 'authMe'
  | 'casesList'
  | 'caseDetail'
  | 'generateDraft'
  | 'reviewCase'
  | 'exportsCreate'
  | 'exportTask'
  | 'exportHistory'
  | 'knowledgeSources'
  | 'auditLogs'

const env = import.meta.env as Record<string, string | undefined>

const routeDefaults: Record<RouteKey, string> = {
  authLogin: '/api/v1/auth/login',
  authMe: '/api/v1/auth/me',
  casesList: '/api/v1/cases',
  caseDetail: '/api/v1/cases/:id',
  generateDraft: '/api/v1/cases/generate-draft',
  reviewCase: '/api/v1/cases/:id/review',
  exportsCreate: '/api/v1/exports',
  exportTask: '/api/v1/exports/:id',
  exportHistory: '/api/v1/exports/history',
  knowledgeSources: '/api/v1/knowledge/sources',
  auditLogs: '/api/v1/audit-logs',
}

const routeEnvMap: Record<RouteKey, string> = {
  authLogin: 'VITE_API_ROUTE_AUTH_LOGIN',
  authMe: 'VITE_API_ROUTE_AUTH_ME',
  casesList: 'VITE_API_ROUTE_CASES_LIST',
  caseDetail: 'VITE_API_ROUTE_CASE_DETAIL',
  generateDraft: 'VITE_API_ROUTE_CASES_GENERATE_DRAFT',
  reviewCase: 'VITE_API_ROUTE_CASES_REVIEW',
  exportsCreate: 'VITE_API_ROUTE_EXPORTS_CREATE',
  exportTask: 'VITE_API_ROUTE_EXPORT_TASK',
  exportHistory: 'VITE_API_ROUTE_EXPORT_HISTORY',
  knowledgeSources: 'VITE_API_ROUTE_KNOWLEDGE_SOURCES',
  auditLogs: 'VITE_API_ROUTE_AUDIT_LOGS',
}

function readEnv(name: string, fallback: string) {
  const value = env[name]?.trim()
  return value ? value : fallback
}

function readQueryKey(name: string, fallback: string) {
  return readEnv(name, fallback)
}

export function getApiRoute(key: RouteKey, params: Record<string, string> = {}) {
  const template = readEnv(routeEnvMap[key], routeDefaults[key])

  return Object.entries(params).reduce(
    (current, [paramKey, paramValue]) => current.replace(`:${paramKey}`, encodeURIComponent(paramValue)),
    template,
  )
}

export function buildCaseListQuery(page = 1, pageSize = 200) {
  return {
    [readQueryKey('VITE_API_QUERY_PAGE_KEY', 'page')]: page,
    [readQueryKey('VITE_API_QUERY_PAGE_SIZE_KEY', 'pageSize')]: pageSize,
  }
}

export function buildAuditLogListQuery(limit = 200) {
  return {
    [readQueryKey('VITE_API_QUERY_LIMIT_KEY', 'limit')]: limit,
  }
}

export function buildLoginPayload(username: string, password: string) {
  return {
    username,
    userName: username,
    loginName: username,
    account: username,
    password,
  }
}

export function buildGenerateDraftPayload(input: {
  scope: TestCase['scope']
  title: string
  requirement: string
}) {
  return {
    scope: input.scope,
    scopeType: input.scope,
    title: input.title,
    requirement: input.requirement,
    requirementSummary: input.requirement,
    requirement_summary: input.requirement,
    summary: input.requirement,
  }
}

export function buildReviewPayload(input: { action: 'approve' | 'reject'; reviewNote: string }) {
  const decision = input.action === 'approve' ? 'approved' : 'rejected'

  return {
    action: input.action,
    reviewAction: input.action,
    decision,
    reviewNote: input.reviewNote,
    review_note: input.reviewNote,
    comment: input.reviewNote,
  }
}

export function buildExportTaskPayload(input: {
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
  return {
    format: input.format,
    exportType: input.format,
    type: input.format,
    filters: input.filters,
    query: input.filters,
  }
}

export function buildCasePayload(item: TestCase) {
  const base = testCaseToCaseDetailPayload(item)
  const steps = base.steps.map((step) => ({
    ...step,
    step: step.action,
    content: step.action,
    result: step.expected,
    proof: step.evidence,
  }))

  return {
    ...base,
    module: base.feature,
    featureName: base.feature,
    scopeType: base.scope,
    priorityLevel: base.priority,
    state: base.status,
    ownerName: base.owner,
    submitterName: base.submitter,
    tagList: [...base.tags],
    labels: [...base.tags],
    preconditionList: base.preconditions.map((content) => ({ content })),
    stepList: steps,
    steps,
    attachments: base.attachments.map((attachment) => ({
      ...attachment,
      fileName: attachment.name,
      type: attachment.kind,
    })),
    activityLog: base.activity.map((entry) => ({
      ...entry,
      message: entry.detail,
      timestamp: entry.time,
      variant: entry.tone,
    })),
    review_note: base.reviewNote,
  }
}
