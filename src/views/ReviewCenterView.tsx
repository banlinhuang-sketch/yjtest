import { useEffect, useMemo, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { LoadingSkeleton } from '../components/LoadingSkeleton.tsx'
import { Toast, type ToastVariant } from '../components/Toast.tsx'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '../components/WorkspaceSidebar.tsx'
import type { Priority, Scope, TestCase } from '../types.ts'
import './ReviewCenterView.css'

interface ToastState {
  variant: ToastVariant
  message: string
}

type ScopeFilter = Scope | 'all'
type PriorityFilter = Priority | 'all'
type SubmitterFilter = string | 'all'
type TimeFilter = 'all' | '1h' | '3h' | '24h'
type ReviewSegment = 'pending' | 'processed'

interface ReviewCenterViewProps {
  cases: TestCase[]
  isLoading?: boolean
  canReview?: boolean
  currentUserName?: string
  currentUserRole?: string
  onRefreshCases: () => Promise<TestCase[] | void>
  onReviewCase: (
    caseId: string,
    input: { action: 'approve' | 'reject'; reviewNote: string },
  ) => Promise<TestCase>
  onOpenWorkbench: () => void
  onOpenCase: (caseId: string) => void
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

const scopeMeta: Record<Scope, { label: string; tone: 'blue' | 'teal' | 'orange' }> = {
  app: { label: '手机 App', tone: 'blue' },
  glasses: { label: '智能眼镜', tone: 'teal' },
  linked: { label: '双端联动', tone: 'orange' },
}

const priorityToneMap: Record<Priority, 'red' | 'blue' | 'amber'> = {
  P0: 'red',
  P1: 'blue',
  P2: 'amber',
}

const segmentOptions: Array<{ key: ReviewSegment; label: string; description: string }> = [
  { key: 'pending', label: '待审核', description: '处理当前等待审核的用例' },
  { key: 'processed', label: '已处理', description: '查看草稿与已沉淀结果' },
]

function formatReviewTime(epoch: number, fallback: string) {
  if (!Number.isFinite(epoch)) {
    return fallback
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epoch))
}

function matchesReviewTime(epoch: number, filter: TimeFilter, referenceTime: number) {
  if (filter === 'all') {
    return true
  }

  const hourMap: Record<Exclude<TimeFilter, 'all'>, number> = {
    '1h': 1,
    '3h': 3,
    '24h': 24,
  }

  return referenceTime - epoch <= hourMap[filter] * 60 * 60 * 1000
}

function buildReviewSummary(item: TestCase) {
  if (item.steps.length > 0) {
    return item.steps.map((step) => step.action)
  }

  return ['待补充关键执行步骤']
}

export function ReviewCenterView({
  cases,
  isLoading = false,
  canReview = false,
  currentUserName = '未命名用户',
  currentUserRole = '测试成员',
  onRefreshCases,
  onReviewCase,
  onOpenWorkbench,
  onOpenCase,
  onOpenExport,
  onOpenKnowledge,
  onOpenStates,
}: ReviewCenterViewProps) {
  const [reviewSegment, setReviewSegment] = useState<ReviewSegment>('pending')
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [submitterFilter, setSubmitterFilter] = useState<SubmitterFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [reviewNotesByCaseId, setReviewNotesByCaseId] = useState<Record<string, string>>({})
  const [commentError, setCommentError] = useState(false)
  const [toastState, setToastState] = useState<ToastState | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const pendingCount = useMemo(() => cases.filter((item) => item.status === '待审核').length, [cases])
  const processedCount = useMemo(() => cases.filter((item) => item.status !== '待审核').length, [cases])

  const segmentCases = useMemo(
    () => cases.filter((item) => (reviewSegment === 'pending' ? item.status === '待审核' : item.status !== '待审核')),
    [cases, reviewSegment],
  )

  const referenceTime = useMemo(() => {
    const timestamps = segmentCases.map((item) => item.updatedAtEpoch)
    return timestamps.length > 0 ? Math.max(...timestamps) : 0
  }, [segmentCases])

  const submitterOptions = useMemo(
    () => ['all', ...new Set(segmentCases.map((item) => item.submitter))],
    [segmentCases],
  )

  const visibleCases = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return segmentCases.filter((item) => {
      if (scopeFilter !== 'all' && item.scope !== scopeFilter) {
        return false
      }

      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      if (submitterFilter !== 'all' && item.submitter !== submitterFilter) {
        return false
      }

      if (!matchesReviewTime(item.updatedAtEpoch, timeFilter, referenceTime)) {
        return false
      }

      if (normalizedKeyword.length > 0) {
        const haystack = `${item.id} ${item.title} ${item.feature} ${item.submitter}`.toLowerCase()
        if (!haystack.includes(normalizedKeyword)) {
          return false
        }
      }

      return true
    })
  }, [keyword, priorityFilter, referenceTime, scopeFilter, segmentCases, submitterFilter, timeFilter])

  const activeSelectedCaseId = useMemo(() => {
    if (selectedCaseId && visibleCases.some((item) => item.id === selectedCaseId)) {
      return selectedCaseId
    }

    return visibleCases[0]?.id ?? ''
  }, [selectedCaseId, visibleCases])

  const selectedCase = useMemo(
    () => visibleCases.find((item) => item.id === activeSelectedCaseId) ?? null,
    [activeSelectedCaseId, visibleCases],
  )

  const activeReviewComment = activeSelectedCaseId
    ? reviewNotesByCaseId[activeSelectedCaseId] ?? selectedCase?.reviewNote ?? ''
    : ''

  useEffect(() => {
    if (!toastState) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastState(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toastState])

  function handleSidebarSelect(nextKey: string) {
    if (nextKey === 'workbench') {
      onOpenWorkbench()
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

  function showToast(variant: ToastVariant, message: string) {
    setToastState({ variant, message })
  }

  function clearSelection() {
    setSelectedCaseId('')
    setCommentError(false)
    setShowApproveDialog(false)
  }

  function resetFilters() {
    setKeyword('')
    setScopeFilter('all')
    setPriorityFilter('all')
    setSubmitterFilter('all')
    setTimeFilter('all')
    clearSelection()
  }

  async function handleRefresh() {
    if (isRefreshing) {
      return
    }

    clearSelection()
    setIsRefreshing(true)

    try {
      await onRefreshCases()
      showToast('info', reviewSegment === 'pending' ? '待审核列表已刷新' : '已处理列表已刷新')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '刷新失败，请稍后重试')
    } finally {
      setIsRefreshing(false)
    }
  }

  function updateReviewComment(value: string) {
    if (!selectedCaseId) {
      return
    }

    setReviewNotesByCaseId((current) => ({
      ...current,
      [selectedCaseId]: value,
    }))
    setCommentError(false)
  }

  async function handleReject() {
    if (reviewSegment !== 'pending' || !selectedCase || !canReview) {
      return
    }

    const currentComment = reviewNotesByCaseId[selectedCase.id] ?? ''

    if (currentComment.trim().length === 0) {
      setCommentError(true)
      showToast('error', '退回草稿必须填写审核意见')
      return
    }

    try {
      await onReviewCase(selectedCase.id, {
        action: 'reject',
        reviewNote: currentComment,
      })
      clearSelection()
      showToast('success', '已退回草稿，可在“已处理”中查看')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '退回失败，请稍后重试')
    }
  }

  function handleApprove() {
    if (reviewSegment !== 'pending' || !selectedCase || !canReview) {
      return
    }

    setShowApproveDialog(true)
  }

  async function confirmApprove() {
    if (!selectedCase) {
      return
    }

    try {
      await onReviewCase(selectedCase.id, {
        action: 'approve',
        reviewNote: reviewNotesByCaseId[selectedCase.id] ?? selectedCase.reviewNote ?? '',
      })
      clearSelection()
      showToast('success', '审核已通过，可在“已处理”中查看')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '审核失败，请稍后重试')
    } finally {
      setShowApproveDialog(false)
    }
  }

  function handleSegmentChange(nextSegment: ReviewSegment) {
    if (nextSegment === reviewSegment) {
      return
    }

    setReviewSegment(nextSegment)
    clearSelection()
  }

  return (
    <div className="review-page-shell">
      <WorkspaceSidebar
        brandIcon="account_tree"
        brandTitle="亿境测试部"
        brandSubtitle="P3 审核中心"
        items={sidebarItems}
        activeKey="review"
        onSelect={handleSidebarSelect}
        userName={currentUserName}
        userRole={currentUserRole}
      />

      <div className="review-shell-main">
        <header className="review-topbar">
          <div className="review-brand">
            <div className="review-brand-mark">
              <Icon name="fact_check" />
            </div>
            <div>
              <h2>审核中心</h2>
              <p>处理来自各业务线的测试用例审核申请</p>
            </div>
          </div>

          <div className="review-user">
            <div>
              <span>当前角色</span>
              <strong>{currentUserRole}</strong>
            </div>
            <button className="review-profile-button" type="button" onClick={onOpenWorkbench}>
              返回工作台
            </button>
          </div>
        </header>

        <section className="review-header">
          <div>
            <h1>P3 审核工作台</h1>
            <p>支持“待审核 / 已处理”双视图切换。处理完成后，用例会自动从待审核中移出并进入已处理视图。</p>
          </div>

          <div className="review-metrics">
            <article className="review-metric primary">
              <span>待审核</span>
              <strong>{pendingCount}</strong>
            </article>
            <article className="review-metric success">
              <span>已处理</span>
              <strong>{processedCount}</strong>
            </article>
            <button className="review-export-button" type="button" onClick={onOpenExport}>
              <Icon name="file_export" />
              <span>前往导出中心</span>
            </button>
          </div>
        </section>

        <section className="review-segment-switch" role="tablist" aria-label="审核视图切换">
          {segmentOptions.map((option) => (
            <button
              key={option.key}
              role="tab"
              aria-selected={reviewSegment === option.key}
              className={`review-segment-button ${reviewSegment === option.key ? 'is-active' : ''}`.trim()}
              type="button"
              onClick={() => handleSegmentChange(option.key)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </section>

        <section className="review-toolbar">
          <label className="review-search">
            <Icon name="search" />
            <input
              placeholder="搜索 Case ID / 标题 / 提交人"
              type="text"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                clearSelection()
              }}
            />
          </label>

          <label className="review-toolbar-select">
            <span>范围</span>
            <select
              value={scopeFilter}
              onChange={(event) => {
                setScopeFilter(event.target.value as ScopeFilter)
                clearSelection()
              }}
            >
              <option value="all">全部范围</option>
              <option value="app">手机 App</option>
              <option value="glasses">智能眼镜</option>
              <option value="linked">双端联动</option>
            </select>
          </label>

          <label className="review-toolbar-select">
            <span>优先级</span>
            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value as PriorityFilter)
                clearSelection()
              }}
            >
              <option value="all">全部优先级</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
            </select>
          </label>

          <label className="review-toolbar-select">
            <span>提交人</span>
            <select
              value={submitterFilter}
              onChange={(event) => {
                setSubmitterFilter(event.target.value as SubmitterFilter)
                clearSelection()
              }}
            >
              <option value="all">所有人</option>
              {submitterOptions
                .filter((item) => item !== 'all')
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>

          <label className="review-toolbar-select">
            <span>时间筛选</span>
            <select
              value={timeFilter}
              onChange={(event) => {
                setTimeFilter(event.target.value as TimeFilter)
                clearSelection()
              }}
            >
              <option value="all">全部时间</option>
              <option value="1h">最近 1 小时</option>
              <option value="3h">最近 3 小时</option>
              <option value="24h">最近 24 小时</option>
            </select>
          </label>

          <div className="review-toolbar-actions">
            <button type="button" aria-label="重置筛选" title="重置筛选" onClick={resetFilters}>
              <Icon name="filter_alt_off" />
            </button>
            <button type="button" aria-label="刷新列表" title="刷新列表" onClick={handleRefresh}>
              <Icon name="refresh" />
            </button>
          </div>
        </section>

        <main className="review-main">
          <aside className="review-list-panel">
            <div className="review-list-head">
              <span>用例列表（{visibleCases.length}）</span>
              <strong>{reviewSegment === 'pending' ? '待审核视图' : '已处理视图'}</strong>
            </div>

            <div className="review-list">
              {isLoading || isRefreshing ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <LoadingSkeleton key={`review-skeleton-${index}`} variant="case-card" />
                ))
              ) : visibleCases.length > 0 ? (
                visibleCases.map((item) => {
                  const isSelected = item.id === activeSelectedCaseId

                  return (
                    <button
                      key={item.id}
                      className={`review-case-card ${isSelected ? 'selected' : ''}`.trim()}
                      type="button"
                      onClick={() => {
                        setSelectedCaseId(item.id)
                        setCommentError(false)
                      }}
                    >
                      {isSelected ? (
                        <span className="review-card-corner">
                          <Icon name="check_circle" />
                        </span>
                      ) : null}

                      <div className="review-card-row">
                        <span className="review-card-id">{item.id}</span>
                        <span className="review-status-chip">{item.status}</span>
                      </div>

                      <h3>{item.title}</h3>
                      <p className="review-card-owner">{item.submitter}</p>

                      <div className="review-card-tags">
                        <span className={`review-scope-chip ${scopeMeta[item.scope].tone}`.trim()}>
                          {scopeMeta[item.scope].label}
                        </span>
                        <span className={`review-priority-chip ${priorityToneMap[item.priority]}`.trim()}>{item.priority}</span>
                        <span className="review-card-time">{formatReviewTime(item.updatedAtEpoch, item.updatedAtLabel)}</span>
                      </div>
                    </button>
                  )
                })
              ) : (
                <EmptyState
                  type="no-data"
                  title={reviewSegment === 'pending' ? '暂无待审核用例' : '暂无已处理用例'}
                  description={
                    reviewSegment === 'pending'
                      ? '当前筛选条件下没有可处理的待审核用例，可以调整筛选条件或回到工作台继续生成草稿。'
                      : '当前筛选条件下没有已处理用例，可以切回待审核继续审批，或先完成一条用例处理。'
                  }
                  actionText={reviewSegment === 'pending' ? '重置筛选' : '切回待审核'}
                  onAction={() => {
                    if (reviewSegment === 'pending') {
                      resetFilters()
                      return
                    }

                    handleSegmentChange('pending')
                  }}
                />
              )}
            </div>
          </aside>

          <section className="review-detail-panel">
            {selectedCase ? (
              <>
                <div className="review-detail-scroll">
                  <article className="review-detail-card">
                    <div className="review-detail-meta">
                      <span className="review-detail-pill">用例详情</span>
                      <span>最近更新：{selectedCase.updatedAtLabel}</span>
                    </div>

                    <h2>{selectedCase.title}</h2>

                    <div className="review-detail-grid">
                      <div>
                        <p>优先级</p>
                        <strong className={`review-priority-text ${priorityToneMap[selectedCase.priority]}`.trim()}>
                          {selectedCase.priority}
                        </strong>
                      </div>
                      <div>
                        <p>审核范围</p>
                        <strong>{selectedCase.feature}</strong>
                      </div>
                      <div>
                        <p>提交人</p>
                        <strong>{selectedCase.submitter}</strong>
                      </div>
                    </div>

                    <section className="review-readonly-block">
                      <h4>测试目标</h4>
                      <div className="review-readonly-box">
                        <p>{selectedCase.objective}</p>
                      </div>
                    </section>

                    <section className="review-readonly-block">
                      <h4>关键步骤摘要</h4>
                      <div className="review-summary-list">
                        {buildReviewSummary(selectedCase).map((step, index) => (
                          <article key={`${selectedCase.id}-${index}`} className="review-summary-item">
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <p>{step}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  </article>
                </div>

                <div className="review-action-bar">
                  {reviewSegment === 'pending' ? (
                    canReview ? (
                      <>
                        <label className={`review-comment-field ${commentError ? 'has-error' : ''}`.trim()}>
                          <span>审核意见</span>
                          <textarea
                            rows={3}
                            value={activeReviewComment}
                            onChange={(event) => updateReviewComment(event.target.value)}
                            placeholder="请输入审核意见，如用例步骤不完整、目标不明确或需补充边界说明，请在此详细描述。"
                          />
                          {commentError ? <small>退回草稿时必须填写审核意见</small> : null}
                        </label>

                        <div className="review-action-buttons">
                          <button className="review-button secondary" type="button" onClick={() => onOpenCase(selectedCase.id)}>
                            <Icon name="open_in_new" />
                            <span>进入详情编辑</span>
                          </button>
                          <button className="review-button danger" type="button" onClick={handleReject}>
                            <Icon name="assignment_return" />
                            <span>退回草稿</span>
                          </button>
                          <button className="review-button primary" type="button" onClick={handleApprove}>
                            <Icon name="task_alt" />
                            <span>审核通过</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="review-result-summary">
                          <div className="review-result-card">
                            <span>当前角色</span>
                            <strong>{currentUserRole}</strong>
                          </div>
                          <div className="review-result-card">
                            <span>操作限制</span>
                            <strong>当前账号可查看待审核用例，但不能提交审核结果。</strong>
                          </div>
                          <div className="review-result-card">
                            <span>建议操作</span>
                            <strong>如需审批，请切换到审核人或管理员账号。</strong>
                          </div>
                        </div>

                        <div className="review-action-buttons">
                          <button className="review-button secondary" type="button" onClick={() => onOpenCase(selectedCase.id)}>
                            <Icon name="open_in_new" />
                            <span>进入详情编辑</span>
                          </button>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div className="review-result-summary">
                        <div className="review-result-card">
                          <span>当前状态</span>
                          <strong>{selectedCase.status}</strong>
                        </div>
                        <div className="review-result-card">
                          <span>审核意见</span>
                          <strong>{selectedCase.reviewNote || '暂无审核意见'}</strong>
                        </div>
                        <div className="review-result-card">
                          <span>最近更新时间</span>
                          <strong>{selectedCase.updatedAtLabel}</strong>
                        </div>
                      </div>

                      <div className="review-action-buttons">
                        <button className="review-button secondary" type="button" onClick={() => onOpenCase(selectedCase.id)}>
                          <Icon name="open_in_new" />
                          <span>进入详情查看</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="review-empty-panel">
                <EmptyState
                  type="no-data"
                  title={reviewSegment === 'pending' ? '请选择要审核的用例' : '请选择要查看的处理结果'}
                  description={
                    visibleCases.length > 0
                      ? reviewSegment === 'pending'
                        ? '左侧选择一条待审核用例后，这里会显示完整预览和审核操作。'
                        : '左侧选择一条已处理用例后，这里会显示处理结果和只读预览。'
                      : reviewSegment === 'pending'
                        ? '当前列表为空，你可以回到工作台继续创建新用例，或调整筛选条件。'
                        : '当前没有已处理结果，可以先回到待审核视图完成一条审批。'
                  }
                  actionText={visibleCases.length > 0 ? '查看第一条' : reviewSegment === 'pending' ? '返回工作台' : '切回待审核'}
                  onAction={() => {
                    if (visibleCases.length > 0) {
                      setSelectedCaseId(visibleCases[0].id)
                      return
                    }

                    if (reviewSegment === 'pending') {
                      onOpenWorkbench()
                      return
                    }

                    handleSegmentChange('pending')
                  }}
                />
              </div>
            )}
          </section>
        </main>
      </div>

      {toastState ? <Toast variant={toastState.variant} message={toastState.message} /> : null}

      {showApproveDialog ? (
        <ConfirmDialog
          title="确认通过该用例审核吗？"
          description="通过后该用例会变更为“已沉淀”，并自动从当前待审核列表中移除。"
          confirmText="确认通过"
          onCancel={() => setShowApproveDialog(false)}
          onConfirm={confirmApprove}
        />
      ) : null}
    </div>
  )
}
