import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { LoadingSkeleton } from '../components/LoadingSkeleton.tsx'
import { Toast } from '../components/Toast.tsx'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '../components/WorkspaceSidebar.tsx'
import { createExportTask, downloadExportFile, waitForExportTask } from '../api/exports.ts'
import type { ExportFormat, Priority, Scope, Status, TestCase } from '../types.ts'
import { buildWorkspaceSidebarItems } from '../workspaceSidebarItems.ts'
import './ExportCenterView.css'

type TimeRange = 'all' | '7d' | '30d' | '90d'
type ToastVariant = 'success' | 'error'
type ExportStatus = 'idle' | 'success' | 'error'

interface ToastState {
  variant: ToastVariant
  message: string
}

interface ExportCenterViewProps {
  cases: TestCase[]
  onOpenWorkbench: () => void
  onOpenReview: () => void
  onOpenKnowledge: () => void
  onOpenStates: () => void
  onOpenAuditLogs: () => void
  canOpenAuditLogs?: boolean
  currentUserName?: string
  currentUserRole?: string
}

const sidebarItems: WorkspaceSidebarItem[] = [
  { key: 'workbench', label: 'P1 工作台', icon: 'dashboard' },
  { key: 'review', label: 'P3 审核中心', icon: 'fact_check' },
  { key: 'export', label: 'P4 导出中心', icon: 'file_export' },
  { key: 'knowledge', label: 'P5 知识基线', icon: 'menu_book' },
  { key: 'states', label: 'P6 状态模板', icon: 'tips_and_updates', sectionLabel: '系统' },
]

const scopeMeta: Record<Scope, { label: string; tone: 'blue' | 'teal' | 'orange' }> = {
  app: { label: 'App', tone: 'blue' },
  glasses: { label: '智能眼镜', tone: 'teal' },
  linked: { label: '双端联动', tone: 'orange' },
}

const priorityMeta: Record<Priority, { tone: 'red' | 'amber' | 'slate'; label: string }> = {
  P0: { tone: 'red', label: 'P0' },
  P1: { tone: 'amber', label: 'P1' },
  P2: { tone: 'slate', label: 'P2' },
}

const statusMeta: Record<Status, { tone: 'slate' | 'amber' | 'emerald'; label: Status }> = {
  草稿: { tone: 'slate', label: '草稿' },
  待审核: { tone: 'amber', label: '待审核' },
  已沉淀: { tone: 'emerald', label: '已沉淀' },
}

const scopeOptions: Array<{ label: string; value: Scope | 'all' }> = [
  { label: '全部范围', value: 'all' },
  { label: 'App', value: 'app' },
  { label: '智能眼镜', value: 'glasses' },
  { label: '双端联动', value: 'linked' },
]

const statusOptions: Array<{ label: string; value: Status | 'all' }> = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: '草稿' },
  { label: '待审核', value: '待审核' },
  { label: '已沉淀', value: '已沉淀' },
]

const priorityOptions: Array<{ label: string; value: Priority | 'all' }> = [
  { label: '全部优先级', value: 'all' },
  { label: 'P0', value: 'P0' },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
]

const timeRangeOptions: Array<{ label: string; value: TimeRange }> = [
  { label: '全部时间', value: 'all' },
  { label: '最近 7 天', value: '7d' },
  { label: '最近 30 天', value: '30d' },
  { label: '最近 90 天', value: '90d' },
]

function formatDateTime(epoch: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epoch))
}

function buildSummary(item: TestCase) {
  if (item.steps[0]?.action) {
    return item.steps[0].action
  }

  return item.objective
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function matchesTimeRange(epoch: number, range: TimeRange) {
  if (range === 'all') {
    return true
  }

  const now = Date.now()
  const dayMap: Record<Exclude<TimeRange, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }

  return now - epoch <= dayMap[range] * 24 * 60 * 60 * 1000
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="export-filter-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function ExportCenterView({
  cases,
  onOpenWorkbench,
  onOpenReview,
  onOpenKnowledge,
  onOpenStates,
  onOpenAuditLogs,
  canOpenAuditLogs = false,
  currentUserName = '管理员',
  currentUserRole = '系统管理员',
}: ExportCenterViewProps) {
  const [scopeFilter, setScopeFilter] = useState<Scope | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [keyword, setKeyword] = useState('')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')
  const [isExporting, setIsExporting] = useState(false)
  const [isFiltering, setIsFiltering] = useState(true)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [toastState, setToastState] = useState<ToastState | null>(null)
  const visibleSidebarItems = useMemo(
    () => (canOpenAuditLogs ? buildWorkspaceSidebarItems({ includeAuditLogs: true }) : sidebarItems),
    [canOpenAuditLogs],
  )

  const tagOptions = useMemo(() => ['all', ...new Set(cases.flatMap((item) => item.tags))], [cases])

  const filteredCases = useMemo(() => {
    const query = keyword.trim().toLowerCase()

    return cases.filter((item) => {
      if (scopeFilter !== 'all' && item.scope !== scopeFilter) {
        return false
      }

      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      if (tagFilter !== 'all' && !item.tags.includes(tagFilter)) {
        return false
      }

      if (!matchesTimeRange(item.updatedAtEpoch, timeRange)) {
        return false
      }

      if (query.length > 0) {
        const haystack = `${item.id} ${item.title} ${item.tags.join(' ')} ${item.owner} ${item.submitter}`.toLowerCase()
        if (!haystack.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [cases, keyword, priorityFilter, scopeFilter, statusFilter, tagFilter, timeRange])

  const activeFilterCount = useMemo(() => {
    const values = [scopeFilter, statusFilter, priorityFilter, timeRange, tagFilter]
    let count = values.filter((value) => value !== 'all').length
    if (keyword.trim()) {
      count += 1
    }
    return count
  }, [keyword, priorityFilter, scopeFilter, statusFilter, tagFilter, timeRange])

  const estimatedSize = useMemo(() => {
    const base = exportFormat === 'excel' ? 0.14 : 0.21
    return Math.max(0.1, filteredCases.length * base).toFixed(1)
  }, [exportFormat, filteredCases.length])

  useEffect(() => {
    if (!toastState) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastState(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toastState])

  useEffect(() => {
    setExportStatus('idle')
  }, [scopeFilter, statusFilter, priorityFilter, timeRange, tagFilter, keyword, exportFormat])

  useEffect(() => {
    setIsFiltering(true)
    const timer = window.setTimeout(() => setIsFiltering(false), 260)
    return () => window.clearTimeout(timer)
  }, [scopeFilter, statusFilter, priorityFilter, timeRange, tagFilter, keyword, cases])

  function showToast(variant: ToastVariant, message: string) {
    setToastState({ variant, message })
  }

  function handleSidebarSelect(nextKey: string) {
    if (nextKey === 'workbench') {
      onOpenWorkbench()
      return
    }

    if (nextKey === 'review') {
      onOpenReview()
      return
    }

    if (nextKey === 'knowledge') {
      onOpenKnowledge()
      return
    }

    if (nextKey === 'audit') {
      onOpenAuditLogs()
      return
    }

    if (nextKey === 'states') {
      onOpenStates()
    }
  }

  function resetFilters() {
    setScopeFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
    setTimeRange('all')
    setTagFilter('all')
    setKeyword('')
  }

  async function handleExport() {
    if (!filteredCases.length) {
      setExportStatus('error')
      showToast('error', '无可导出数据，请调整筛选条件')
      return
    }

    setIsExporting(true)
    setExportStatus('idle')

    try {
      const createdTask = await createExportTask({
        format: exportFormat,
        filters: {
          keyword,
          scope: scopeFilter,
          status: statusFilter,
          priority: priorityFilter,
          timeRange,
          tag: tagFilter,
        },
      })
      const taskResult = await waitForExportTask(createdTask.taskId)

      if (taskResult.status !== 'completed' || !taskResult.downloadUrl) {
        throw new Error(taskResult.errorMessage ?? '导出任务未能成功完成。')
      }

      await downloadExportFile(taskResult.downloadUrl, taskResult.fileName)

      setExportStatus('success')
      showToast('success', '导出成功')
    } catch (error) {
      setExportStatus('error')
      showToast('error', error instanceof Error ? error.message : '导出失败，请稍后重试')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="export-page-shell">
      <WorkspaceSidebar
        brandIcon="account_tree"
        brandTitle="亿境测试部"
        items={visibleSidebarItems}
        activeKey="export"
        onSelect={handleSidebarSelect}
        userName={currentUserName}
        userRole={currentUserRole}
        theme="dark"
      />

      <div className="export-main-shell">
        <header className="export-topbar">
          <div className="export-topbar-title">
            <h1>导出中心</h1>
            <div className="export-count-pill">
              当前可导出 <strong>{filteredCases.length}</strong> 条
            </div>
          </div>

          <button className="export-icon-button" type="button" aria-label={"\u901a\u77e5"} title={"\u901a\u77e5"}>
            <Icon name="notifications" />
          </button>
        </header>

        <section className="export-filter-bar">
          <div className="export-filter-grid">
            <FilterField label="业务范围 (Scope)">
              <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as Scope | 'all')}>
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="当前状态 (Status)">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | 'all')}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="优先级 (Priority)">
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as Priority | 'all')}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="时间范围">
              <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
                {timeRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="标签">
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                {tagOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '全部标签' : option}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="关键词">
              <input
                type="text"
                data-testid="export-keyword-input"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索 ID / 标题 / 标签"
              />
            </FilterField>

            <button className="export-secondary-button export-reset-button" type="button" onClick={resetFilters}>
              重置
            </button>
          </div>

          <div className="export-filter-summary">
            <span>
              已启用筛选 <strong>{activeFilterCount}</strong> 项
            </span>
            <span>
              总用例 <strong>{cases.length}</strong> 条
            </span>
          </div>
        </section>

        <section className="export-content-shell">
          {isFiltering ? (
            <LoadingSkeleton variant="table-card" className="export-skeleton" />
          ) : filteredCases.length ? (
            <div className="export-table-card">
              <div className="export-table-head">
                <div>
                  <h2>待导出列表</h2>
                  <p>当前导出动作会直接作用于下方筛选结果，适合后续替换成真实后端打包接口。</p>
                </div>
                <div className="export-table-stat">
                  <span>导出条目</span>
                  <strong>{filteredCases.length}</strong>
                </div>
              </div>

              <div className="export-table-wrap">
                <table className="export-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>标题</th>
                      <th>范围</th>
                      <th>状态</th>
                      <th>优先级</th>
                      <th>更新时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((item) => (
                      <tr key={item.id}>
                        <td className="export-id-cell">{item.id}</td>
                        <td className="export-title-cell">
                          <strong>{item.title}</strong>
                          <span>{buildSummary(item)}</span>
                          <div className="export-tag-row">
                            {item.tags.map((tag) => (
                              <span key={`${item.id}-${tag}`} className="export-tag-chip">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`export-scope-chip ${scopeMeta[item.scope].tone}`}>
                            {scopeMeta[item.scope].label}
                          </span>
                        </td>
                        <td>
                          <span className={`export-status-chip ${statusMeta[item.status].tone}`}>
                            {statusMeta[item.status].label}
                          </span>
                        </td>
                        <td>
                          <span className={`export-priority-chip ${priorityMeta[item.priority].tone}`}>
                            {priorityMeta[item.priority].label}
                          </span>
                        </td>
                        <td className="export-time-cell">{formatDateTime(item.updatedAtEpoch)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              type="no-data"
              title="无匹配的导出数据"
              description="当前筛选条件下没有可导出的测试用例，调整范围、状态或标签后再试一次。"
              actionText="清空筛选"
              onAction={resetFilters}
            />
          )}
        </section>

        <footer className="export-footer">
          <div className="export-format-block">
            <span className="export-footer-label">导出格式</span>
            <div className="export-format-switch" role="tablist" aria-label="导出格式">
              <button
                className={classNames('export-format-option', exportFormat === 'excel' && 'is-active')}
                type="button"
                onClick={() => setExportFormat('excel')}
              >
                Excel (.xlsx)
              </button>
              <button
                className={classNames('export-format-option', exportFormat === 'word' && 'is-active')}
                type="button"
                onClick={() => setExportFormat('word')}
              >
                Word (.docx)
              </button>
            </div>
          </div>

          <div className="export-footer-copy">
            <span className="export-footer-label">导出说明</span>
            <p>
              当前为前端模拟导出：筛选结果会被打包成可下载文件，后续只需要把 <code>handleExport</code>{' '}
              替换为真实接口调用即可接入服务端。
            </p>
            {exportStatus === 'error' ? (
              <p className="export-status-hint error" data-testid="export-status-error">
                最近一次导出未完成，请检查筛选条件、网络状态或切换导出格式后重试。
              </p>
            ) : null}
            {exportStatus === 'success' ? (
              <p className="export-status-hint success" data-testid="export-status-success">
                最近一次导出已完成，可继续调整筛选条件导出下一批数据。
              </p>
            ) : null}
          </div>

          <div className="export-footer-actions">
            <div className="export-footer-meta">
              <span>已匹配 {filteredCases.length} 条用例</span>
              <strong>预计文件大小约 {estimatedSize} MB</strong>
            </div>

            <button className="export-primary-button" type="button" data-testid="export-start-button" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <span className="export-spinner" aria-hidden="true" /> : <Icon name="download" />}
              <span>{isExporting ? '正在打包...' : '开始导出'}</span>
            </button>
          </div>
        </footer>
      </div>

      {toastState ? <Toast variant={toastState.variant} message={toastState.message} /> : null}
    </div>
  )
}
