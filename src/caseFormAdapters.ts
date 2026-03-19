import type { StructuredListItem } from './components/StructuredListEditor.tsx'
import type { TestCase } from './types.ts'

export type ScopeValue = TestCase['scope'] | ''
export type StructuredFieldKey = 'preconditions' | 'steps' | 'expected' | 'evidence'

export interface CaseFormState {
  id: string
  title: string
  feature: string
  owner: string
  tags: string[]
  scope: ScopeValue
  priority: TestCase['priority']
  status: TestCase['status']
  objective: string
  notes: string
  preconditions: StructuredListItem[]
  steps: StructuredListItem[]
  expected: StructuredListItem[]
  evidence: StructuredListItem[]
}

export function createStructuredId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createStructuredItem(prefix: string, content = ''): StructuredListItem {
  return {
    id: createStructuredId(prefix),
    content,
  }
}

export function parseTagsInput(value: string) {
  return value
    .split(/[,\n，/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildCaseFormStateFromCase(item: TestCase): CaseFormState {
  return {
    id: item.id,
    title: item.title,
    feature: item.feature,
    owner: item.owner,
    tags: [...item.tags],
    scope: item.scope,
    priority: item.priority,
    status: item.status,
    objective: item.objective,
    notes: item.notes,
    preconditions: item.preconditions.map((entry, index) => ({
      id: `precondition-seed-${index + 1}`,
      content: entry,
    })),
    steps: item.steps.map((entry, index) => ({
      id: `step-seed-${index + 1}`,
      content: entry.action,
    })),
    expected: item.steps.map((entry, index) => ({
      id: `expected-seed-${index + 1}`,
      content: entry.expected,
    })),
    evidence: item.steps.map((entry, index) => ({
      id: `evidence-seed-${index + 1}`,
      content: entry.evidence,
    })),
  }
}

export function buildTestCaseFromFormState(
  state: CaseFormState,
  source: TestCase | null,
  updatedAtLabel: string,
): TestCase {
  const stepCount = Math.max(state.steps.length, state.expected.length, state.evidence.length)
  const nextSteps = Array.from({ length: stepCount }, (_, index) => ({
    action: state.steps[index]?.content ?? '',
    expected: state.expected[index]?.content ?? '',
    evidence: state.evidence[index]?.content ?? '',
  })).filter(
    (item) =>
      item.action.trim().length > 0 ||
      item.expected.trim().length > 0 ||
      item.evidence.trim().length > 0,
  )

  return {
    id: state.id,
    title: state.title.trim(),
    feature: state.feature,
    scope: (state.scope || source?.scope || 'app') as TestCase['scope'],
    priority: state.priority,
    status: state.status,
    owner: state.owner,
    submitter: source?.submitter ?? state.owner,
    objective: state.objective,
    notes: state.notes,
    tags: [...state.tags],
    preconditions: state.preconditions
      .map((item) => item.content.trim())
      .filter((item) => item.length > 0),
    steps: nextSteps,
    attachments: source?.attachments.map((item) => ({ ...item })) ?? [],
    activity: source?.activity.map((item) => ({ ...item })) ?? [],
    reviewNote: source?.reviewNote ?? '',
    updatedAtLabel,
    updatedAtEpoch: Date.now(),
  }
}

export function serializeCaseFormState(state: CaseFormState) {
  return JSON.stringify(state)
}

export function updateStructuredItems(
  items: StructuredListItem[],
  updater: (items: StructuredListItem[]) => StructuredListItem[],
  prefix: string,
) {
  const nextItems = updater(items)
  return nextItems.length > 0 ? nextItems : [createStructuredItem(prefix)]
}
