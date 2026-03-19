import type { Attachment, ActivityEntry, KnowledgeTab, Priority, Scope, Status, StepRow } from '../types.ts'

export interface ApiUser {
  id: string
  name: string
  role: string
  roleCode?: 'tester' | 'reviewer' | 'admin'
  roleLabel?: string
}

export interface LoginResponse {
  accessToken: string
  user: ApiUser
}

export interface CaseSummaryDTO {
  id: string
  title: string
  feature: string
  scope: Scope
  priority: Priority
  status: Status
  owner: string
  submitter: string
  tags: string[]
  updatedAt: string
}

export interface CaseDetailDTO extends CaseSummaryDTO {
  objective: string
  notes: string
  preconditions: string[]
  steps: StepRow[]
  attachments: Attachment[]
  activity: ActivityEntry[]
  reviewNote: string
}

export interface CaseListResponse {
  items: CaseSummaryDTO[]
  total: number
}

export interface ExportTaskCreateResponse {
  taskId: string
  status: 'pending'
}

export interface ExportTaskStatusResponse {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  fileName?: string
  downloadUrl?: string
  errorMessage?: string
}

export type KnowledgeSourceCategory = Exclude<KnowledgeTab, 'all'>

export interface KnowledgeSourceDTO {
  id: string
  title: string
  category: KnowledgeSourceCategory
  categoryLabel: string
  summary: string
  updatedAt: string
  icon: string
  accent: string
}

export interface KnowledgeSourceListResponse {
  items: KnowledgeSourceDTO[]
  total: number
}
