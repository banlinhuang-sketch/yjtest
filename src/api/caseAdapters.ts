import type { CaseDetailDTO } from './contracts.ts'
import type { TestCase } from '../types.ts'

export function formatCaseUpdatedLabel(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function caseDetailDtoToTestCase(item: CaseDetailDTO): TestCase {
  return {
    id: item.id,
    title: item.title,
    feature: item.feature,
    scope: item.scope,
    priority: item.priority,
    status: item.status,
    owner: item.owner,
    submitter: item.submitter,
    objective: item.objective,
    notes: item.notes,
    tags: [...item.tags],
    preconditions: [...item.preconditions],
    steps: item.steps.map((step) => ({ ...step })),
    attachments: item.attachments.map((attachment) => ({ ...attachment })),
    activity: item.activity.map((entry) => ({ ...entry })),
    reviewNote: item.reviewNote,
    updatedAtLabel: formatCaseUpdatedLabel(item.updatedAt),
    updatedAtEpoch: Date.parse(item.updatedAt),
  }
}

export function testCaseToCaseDetailPayload(item: TestCase) {
  return {
    id: item.id,
    title: item.title,
    feature: item.feature,
    scope: item.scope,
    priority: item.priority,
    status: item.status,
    owner: item.owner,
    submitter: item.submitter,
    objective: item.objective,
    notes: item.notes,
    tags: [...item.tags],
    preconditions: [...item.preconditions],
    steps: item.steps.map((step) => ({ ...step })),
    attachments: item.attachments.map((attachment) => ({ ...attachment })),
    activity: item.activity.map((entry) => ({ ...entry })),
    reviewNote: item.reviewNote,
  }
}
