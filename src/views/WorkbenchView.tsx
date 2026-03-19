import { useEffect, useMemo, useRef, useState } from 'react'

import { CaseInlineEditor } from '../components/CaseInlineEditor.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { LoadingSkeleton } from '../components/LoadingSkeleton.tsx'
import { Toast } from '../components/Toast.tsx'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '../components/WorkspaceSidebar.tsx'
import { sampleKnowledge, scopeMeta } from '../data.ts'
import type { Priority, Scope, TestCase } from '../types.ts'
import { formatNowLabel, matchesCase } from '../utils.ts'

type PriorityFilter = Priority | 'all'

interface WorkbenchViewProps {
  cases: TestCase[]
  isLoading?: boolean
  onGenerateDraft: (input: {
    scope: TestCase['scope']
    title: string
    requirement: string
  }) => Promise<TestCase>
  onCreateCase: (item: TestCase) => Promise<TestCase>
  onInlineSaveCase: (nextCase: TestCase, detail: string) => void
  onOpenCase: (caseId: string) => void
  onOpenReview: () => void
  onOpenExport: () => void
  onOpenKnowledge: () => void
  onOpenStates: () => void
}

const sidebarItems: WorkspaceSidebarItem[] = [
  { key: 'workbench', label: 'P1 工作台', icon: 'dashboard' },
  { key: 'review', label: 'P3 审核中心', icon: 'fact_check' },
  { key: 'export', label: 'P4 导出中心', icon: 'file_export' },
  { key: 'knowledge', label: 'P5 知识基线', icon: 'menu_book' },
  { key: 'states', label: 'P6 状态模板', icon: 'tips_and_updates', sectionLabel: '系统' },
]

const priorityOptions: Array<{ label: string; value: PriorityFilter }> = [
  { label: '全部优先级', value: 'all' },
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
]

const scopeToneMap: Record<Scope, 'blue' | 'teal' | 'orange'> = {
  app: 'blue',
  glasses: 'teal',
  linked: 'orange',
}

const priorityToneMap: Record<Priority, string> = {
  P0: 'priority-p0',
  P1: 'priority-p1',
  P2: 'priority-p2',
}

const statusToneMap: Record<TestCase['status'], string> = {
  草稿: 'status-draft',
  待审核: 'status-pending',
  已沉淀: 'status-stable',
}

function OverviewCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string
  value: number
  note: string
  icon: string
  tone: 'blue' | 'orange' | 'emerald'
}) {
  return (
    <article className="overview-card">
      <div className="overview-copy">
        <p>{label}</p>
        <strong>{value.toLocaleString('zh-CN')}</strong>
        <span className="overview-card-note neutral">
          <Icon name="timeline" />
          {note}
        </span>
      </div>
      <div className={`overview-icon ${tone}`.trim()}>
        <Icon name={icon} />
      </div>
    </article>
  )
}

function ScopeFilterCard({
  scope,
  count,
  active,
  onClick,
}: {
  scope: Scope
  count: number
  active: boolean
  onClick: () => void
}) {
  const meta = scopeMeta[scope]
  const tone = scopeToneMap[scope]

  return (
    <button className={`filter-card ${tone} ${active ? 'active' : ''}`.trim()} type="button" onClick={onClick}>
      <div className="filter-card-icon">
        <Icon name={scope === 'glasses' ? 'visibility' : scope === 'linked' ? 'hub' : 'smartphone'} />
      </div>
      <div>
        <h5>{meta.label}</h5>
        <p>
          {meta.description} · {count} 条
        </p>
      </div>
      {active ? (
        <span className="filter-card-check">
          <Icon name="check_circle" filled />
        </span>
      ) : null}
    </button>
  )
}

function touchCase(item: TestCase, detail: string) {
  const time = Date.now()
  const timeLabel = formatNowLabel()

  return {
    ...item,
    updatedAtEpoch: time,
    updatedAtLabel: timeLabel,
    activity: [{ time: timeLabel, detail, tone: 'primary' as const }, ...item.activity].slice(0, 6),
  }
}

function cloneCase(item: TestCase, index: number): TestCase {
  const copy = touchCase(
    {
      ...item,
      id: `${item.id}-COPY-${String(index).padStart(2, '0')}`,
      title: `${item.title}（副本）`,
      status: '草稿',
      tags: [...item.tags],
      preconditions: [...item.preconditions],
      steps: item.steps.map((step) => ({ ...step })),
      attachments: item.attachments.map((attachment) => ({ ...attachment })),
      activity: item.activity.map((entry) => ({ ...entry })),
    },
    '工作台克隆了一条新草稿。',
  )

  return {
    ...copy,
    reviewNote: '',
  }
}

function CaseCard({
  item,
  selected,
  onSelect,
  onOpenFullEditor,
  onClone,
}: {
  item: TestCase
  selected: boolean
  onSelect: () => void
  onOpenFullEditor: () => void
  onClone: () => void
}) {
  const tone = scopeToneMap[item.scope]

  return (
    <article className={`case-item ${selected ? 'selected' : ''}`.trim()}>
      <button className="case-item-button" type="button" onClick={onSelect}>
        <div className="case-item-top">
          <span className="case-item-id">{item.id}</span>
          <div className="case-item-tags">
            <span className={`status-chip ${statusToneMap[item.status]}`}>{item.status}</span>
            <span className={`priority-chip ${priorityToneMap[item.priority]}`}>{item.priority}</span>
          </div>
        </div>

        <h5 className="list-card-title">{item.title}</h5>
        <p className="case-item-meta">
          {item.feature} · {item.owner}
        </p>

        <div className="case-item-bottom">
          <div className={`scope-tag ${tone}`.trim()}>
            <Icon name={item.scope === 'glasses' ? 'visibility' : item.scope === 'linked' ? 'hub' : 'smartphone'} />
            <span>{scopeMeta[item.scope].label}</span>
          </div>
          <div className="case-item-actions">
            <button
              className="case-action primary"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpenFullEditor()
              }}
            >
              全屏编辑
            </button>
            <button
              className="case-action secondary"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onClone()
              }}
            >
              克隆
            </button>
          </div>
        </div>
      </button>
    </article>
  )
}

export function WorkbenchView({
  cases,
  isLoading = false,
  onGenerateDraft,
  onCreateCase,
  onInlineSaveCase,
  onOpenCase,
  onOpenReview,
  onOpenExport,
  onOpenKnowledge,
  onOpenStates,
}: WorkbenchViewProps) {
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [filterScope, setFilterScope] = useState<Scope | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [draftScope, setDraftScope] = useState<Scope>('app')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSummary, setDraftSummary] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(cases[0]?.id ?? null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const filteredCases = useMemo(() => {
    const query = keyword.trim().toLowerCase()

    return cases.filter((item) => {
      if (filterScope && item.scope !== filterScope) {
        return false
      }

      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      return matchesCase(item, query)
    })
  }, [cases, filterScope, keyword, priorityFilter])

  const activeSelectedCaseId = useMemo(() => {
    if (selectedCaseId && cases.some((item) => item.id === selectedCaseId)) {
      return selectedCaseId
    }

    return cases[0]?.id ?? null
  }, [cases, selectedCaseId])

  const selectedCase = useMemo(
    () => (activeSelectedCaseId ? cases.find((item) => item.id === activeSelectedCaseId) ?? null : null),
    [activeSelectedCaseId, cases],
  )

  const totalCount = cases.length
  const linkedCount = cases.filter((item) => item.scope === 'linked').length
  const exportableCount = cases.filter((item) => item.status === '已沉淀').length
  const knowledgeSourceCount = sampleKnowledge.length
  const readyToGenerate = draftTitle.trim().length > 0 && draftSummary.trim().length > 0

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  function handleSidebarSelect(nextKey: string) {
    if (nextKey === 'review') {
      onOpenReview()
      return
    }

    if (nextKey === 'export') {
      onOpenExport()
      return
    }

    if (nextKey === 'knowledge') {
      onOpenKnowledge()
      return
    }

    if (nextKey === 'states') {
      onOpenStates()
    }
  }

  function toggleScope(scope: Scope) {
    setFilterScope((current) => (current === scope ? null : scope))
  }

  function focusComposer() {
    setFilterScope(null)
    setPriorityFilter('all')
    setKeyword('')
    titleInputRef.current?.focus()
  }

  async function handleGenerateDraft() {
    if (!readyToGenerate || isGenerating) {
      return
    }

    const nextTitle = draftTitle.trim()
    const nextSummary = draftSummary.trim()
    const nextScope = draftScope

    setFilterScope(null)
    setPriorityFilter('all')
    setKeyword('')
    setIsGenerating(true)

    try {
      const nextCase = await onGenerateDraft({
        scope: nextScope,
        title: nextTitle,
        requirement: nextSummary,
      })
      setSelectedCaseId(nextCase.id)
      setDraftScope('app')
      setDraftTitle('')
      setDraftSummary('')
      setToastMessage('草稿已生成，并已在右侧打开编辑。')
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : '草稿生成失败，请稍后重试。')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCloneCase(item: TestCase) {
    const nextCase = cloneCase(item, cases.length + 1)
    try {
      const createdCase = await onCreateCase(nextCase)
      setSelectedCaseId(createdCase.id)
      setToastMessage('已克隆为新草稿。')
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : '克隆失败，请稍后重试。')
    }
  }

  function handleInlineCaseChange(nextCase: TestCase, detail: string) {
    onInlineSaveCase(nextCase, detail)
  }

  return (
    <div className="workbench-shell">
      <WorkspaceSidebar
        brandIcon="dataset"
        brandTitle="亿境测试部"
        brandSubtitle="测试用例管理平台"
        items={sidebarItems}
        activeKey="workbench"
        onSelect={handleSidebarSelect}
        userName="Banlin Huang"
        userRole="测试设计负责人"
      />

      <main className="workbench-main">
        <header className="workbench-topbar">
          <div className="workbench-topbar-left">
            <h2>P1 用例工作台</h2>
            <span className="topbar-divider" />
            <nav className="workbench-breadcrumb" aria-label="面包屑">
              <span>项目</span>
              <Icon name="chevron_right" />
              <span className="active">亿境测试部 v2.4</span>
            </nav>
          </div>

          <div className="workbench-topbar-right">
            <label className="topbar-search">
              <Icon name="search" />
              <input
                aria-label="搜索用例"
                placeholder="搜索标题、模块、负责人或标签"
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>

            <label className="toolbar-select">
              <span>优先级</span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="topbar-icon-button" type="button" aria-label={"\u524d\u5f80\u5ba1\u6838\u4e2d\u5fc3"} title={"\u524d\u5f80\u5ba1\u6838\u4e2d\u5fc3"} onClick={onOpenReview}>
              <Icon name="fact_check" />
            </button>
          </div>
        </header>

        <div className="workbench-content">
          <section className="overview-grid" aria-label="概览统计">
            <OverviewCard
              label="总用例数"
              value={totalCount}
              note="按当前工作台数据实时计算"
              icon="database"
              tone="blue"
            />
            <OverviewCard
              label="可导出用例数"
              value={exportableCount}
              note="已沉淀用例可直接进入导出中心"
              icon="inventory_2"
              tone="emerald"
            />
            <OverviewCard
              label="双端联动用例数"
              value={linkedCount}
              note="覆盖同步、断连重连与状态一致性"
              icon="hub"
              tone="orange"
            />
            <OverviewCard
              label="知识源数量"
              value={knowledgeSourceCount}
              note="用于生成草案和回归分析的知识基线"
              icon="menu_book"
              tone="blue"
            />
          </section>

          <section className="section-stack" aria-label="范围切换">
            <div className="section-head-row">
              <span className="section-label">范围切换</span>
              <span className="section-caption">按范围查看工作台当前用例覆盖分布</span>
            </div>

            <div className="scope-grid">
              {(['app', 'glasses', 'linked'] as Scope[]).map((scope) => (
                <ScopeFilterCard
                  key={scope}
                  active={filterScope === scope}
                  count={cases.filter((item) => item.scope === scope).length}
                  scope={scope}
                  onClick={() => toggleScope(scope)}
                />
              ))}
            </div>
          </section>

          <section className="workbench-grid">
            <div className="left-stack">
              <section className="composer-card">
                <div className="composer-card-header">
                  <h4>
                    <Icon name="edit_note" />
                    需求输入区
                  </h4>
                </div>
                <div className="composer-card-body">
                  <div className="field-group">
                    <label htmlFor="draft-scope">范围</label>
                    <select
                      id="draft-scope"
                      value={draftScope}
                      onChange={(event) => setDraftScope(event.target.value as Scope)}
                    >
                      <option value="app">手机 App</option>
                      <option value="glasses">智能眼镜</option>
                      <option value="linked">双端联动</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="draft-title">标题</label>
                    <input
                      id="draft-title"
                      ref={titleInputRef}
                      placeholder="例如：眼镜断连后通知补偿链路校验"
                      type="text"
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="draft-summary">需求摘要</label>
                    <textarea
                      id="draft-summary"
                      placeholder="请补充业务背景、边界条件、跨端链路和重点风险，便于 Agent 生成高质量草稿。"
                      rows={6}
                      value={draftSummary}
                      onChange={(event) => setDraftSummary(event.target.value)}
                    />
                  </div>

                  <p className="composer-note">
                    当前生成范围：
                    <span className={`scope-tag ${scopeToneMap[draftScope]}`.trim()}>
                      <Icon
                        name={draftScope === 'glasses' ? 'visibility' : draftScope === 'linked' ? 'hub' : 'smartphone'}
                      />
                      <span>{scopeMeta[draftScope].label}</span>
                    </span>
                  </p>

                  <button
                    className="compose-button"
                    disabled={!readyToGenerate || isGenerating}
                    type="button"
                    onClick={handleGenerateDraft}
                  >
                    {isGenerating ? <span className="button-spinner" aria-hidden="true" /> : <Icon name="auto_awesome" />}
                    {isGenerating ? 'Agent 生成中...' : '生成草案'}
                  </button>
                </div>
              </section>

              <section className="guideline-card">
                <h4>
                  <Icon name="info" />
                  用例编写原则
                </h4>
                <ul className="guideline-list">
                  <li>
                    <strong>清晰性：</strong>
                    标题需要直指业务对象、触发动作和边界场景。
                  </li>
                  <li>
                    <strong>可追溯：</strong>
                    草稿内容应能回溯到需求摘要中的风险点和恢复路径。
                  </li>
                  <li>
                    <strong>联动意识：</strong>
                    涉及双端业务时，优先补充同步、断连重连和状态一致性。
                  </li>
                  <li>
                    <strong>可导出：</strong>
                    已沉淀用例会进入导出中心，字段命名尽量保持统一。
                  </li>
                </ul>
              </section>
            </div>

            <div className="right-stack">
              <section>
                <div className="case-list-head-row">
                  <div>
                    <h4 className="section-label">最新用例列表</h4>
                    <p className="case-list-summary">
                      当前结果 {filteredCases.length} 条
                      {filterScope ? ` · 范围：${scopeMeta[filterScope].label}` : ''}
                      {priorityFilter !== 'all' ? ` · 优先级：${priorityFilter}` : ''}
                    </p>
                  </div>
                  <div className="case-list-actions">
                    <button className="list-icon-button" type="button" aria-label={"\u524d\u5f80\u5ba1\u6838\u4e2d\u5fc3"} title={"\u524d\u5f80\u5ba1\u6838\u4e2d\u5fc3"} onClick={onOpenReview}>
                      <Icon name="fact_check" />
                    </button>
                    <button className="list-icon-button" type="button" aria-label={"\u524d\u5f80\u5bfc\u51fa\u4e2d\u5fc3"} title={"\u524d\u5f80\u5bfc\u51fa\u4e2d\u5fc3"} onClick={onOpenExport}>
                      <Icon name="download" />
                    </button>
                  </div>
                </div>

                <div className="case-list">
                  {isLoading || isGenerating ? <LoadingSkeleton variant="case-card" /> : null}

                  {filteredCases.length > 0 ? (
                    filteredCases.map((item) => (
                      <CaseCard
                        key={item.id}
                        item={item}
                        selected={item.id === activeSelectedCaseId}
                        onSelect={() => setSelectedCaseId(item.id)}
                        onOpenFullEditor={() => onOpenCase(item.id)}
                        onClone={() => handleCloneCase(item)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      type="no-data"
                      title="暂无符合条件的用例"
                      description="可以清空搜索词和筛选条件，或者直接从左侧需求输入区生成一条新的测试用例草稿。"
                      actionText="去创建"
                      onAction={focusComposer}
                    />
                  )}
                </div>
              </section>

              <CaseInlineEditor
                key={selectedCase?.id ?? 'inline-editor-empty'}
                item={selectedCase}
                onOpenFullEditor={() => (selectedCase ? onOpenCase(selectedCase.id) : undefined)}
                onCommit={handleInlineCaseChange}
              />
            </div>
          </section>
        </div>
      </main>

      {toastMessage ? <Toast variant="success" message={toastMessage} /> : null}
    </div>
  )
}
