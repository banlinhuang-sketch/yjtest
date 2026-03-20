export type View = 'editor' | 'review' | 'export' | 'knowledge' | 'empty'

export type Scope = 'app' | 'glasses' | 'linked'

export type Priority = 'P0' | 'P1' | 'P2'

export type Status = '草稿' | '待审核' | '已沉淀'

export type ExportFormat = 'excel' | 'word'

export type KnowledgeTab =
  | 'all'
  | 'business'
  | 'hardware'
  | 'flow'
  | 'history'
  | 'matrix'
  | 'terms'

export interface StepRow {
  action: string
  expected: string
  evidence: string
}

export interface Attachment {
  name: string
  kind: 'image' | 'doc' | 'video' | 'log'
}

export interface ActivityEntry {
  time: string
  detail: string
  tone: 'primary' | 'neutral' | 'positive'
}

export interface TestCase {
  id: string
  title: string
  feature: string
  scope: Scope
  priority: Priority
  status: Status
  owner: string
  submitter: string
  objective: string
  notes: string
  tags: string[]
  preconditions: string[]
  steps: StepRow[]
  attachments: Attachment[]
  activity: ActivityEntry[]
  reviewNote: string
  updatedAtLabel: string
  updatedAtEpoch: number
}

export interface KnowledgeResource {
  id: string
  title: string
  category: KnowledgeTab
  categoryLabel: string
  summary: string
  updatedAt: string
  icon: string
  accent: string
}

export interface AuditLogEntry {
  id: string
  actorId: string
  actorName: string
  actorRoleCode: 'tester' | 'reviewer' | 'admin'
  actorRoleLabel: string
  action: string
  targetType: string
  targetId: string
  targetTitle: string
  detail: string
  metadata: Record<string, unknown>
  createdAt: string
}
