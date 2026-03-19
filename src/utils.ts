import { scopeMeta } from './data.ts'
import type { Attachment, Priority, Status, TestCase } from './types.ts'

export function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function formatNowLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function matchesCase(item: TestCase, keyword: string) {
  if (!keyword) return true

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
}

export function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function priorityClass(priority: Priority) {
  return {
    P0: 'priority-p0',
    P1: 'priority-p1',
    P2: 'priority-p2',
  }[priority]
}

export function statusClass(status: Status) {
  return {
    草稿: 'status-draft',
    待审核: 'status-review',
    已沉淀: 'status-stable',
  }[status]
}

export function attachmentIcon(kind: Attachment['kind']) {
  return {
    image: 'image',
    doc: 'description',
    video: 'videocam',
    log: 'receipt_long',
  }[kind]
}

export function exportCasesAsCsv(
  cases: TestCase[],
  includePreconditions: boolean,
  includeSteps: boolean,
) {
  const header = [
    'ID',
    '标题',
    '范围',
    '模块',
    '优先级',
    '状态',
    '负责人',
    '标签',
    '目标',
    '前置条件',
    '步骤明细',
  ]

  const rows = cases.map((item) =>
    [
      item.id,
      item.title,
      scopeMeta[item.scope].label,
      item.feature,
      item.priority,
      item.status,
      item.owner,
      item.tags.join(' / '),
      item.objective,
      includePreconditions ? item.preconditions.join(' | ') : '未导出',
      includeSteps
        ? item.steps
            .map(
              (step, index) =>
                `${index + 1}. ${step.action} -> ${step.expected} [${step.evidence}]`,
            )
            .join(' | ')
        : '未导出',
    ]
      .map((value) => escapeCsv(value))
      .join(','),
  )

  return [header.map((value) => escapeCsv(value)).join(','), ...rows].join('\n')
}

export function exportCasesAsMarkdown(
  cases: TestCase[],
  includePreconditions: boolean,
  includeSteps: boolean,
) {
  const sections = cases.map((item) => {
    const preconditionBlock = includePreconditions
      ? item.preconditions.map((entry, index) => `${index + 1}. ${entry}`).join('\n')
      : '未导出前置条件'
    const stepBlock = includeSteps
      ? item.steps
          .map(
            (step, index) =>
              `${index + 1}. 操作：${step.action}\n   预期：${step.expected}\n   证据：${step.evidence}`,
          )
          .join('\n')
      : '未导出步骤明细'

    return [
      `## ${item.id} ${item.title}`,
      `- 范围：${scopeMeta[item.scope].label}`,
      `- 模块：${item.feature}`,
      `- 优先级：${item.priority}`,
      `- 状态：${item.status}`,
      `- 负责人：${item.owner}`,
      `- 标签：${item.tags.join(' / ')}`,
      '',
      '### 测试目标',
      item.objective,
      '',
      '### 前置条件',
      preconditionBlock,
      '',
      '### 步骤与预期',
      stepBlock,
    ].join('\n')
  })

  return ['# 亿境测试部导出结果', ...sections].join('\n\n')
}
