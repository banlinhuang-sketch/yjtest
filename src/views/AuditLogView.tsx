import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { LoadingSkeleton } from '../components/LoadingSkeleton.tsx'
import { Toast, type ToastVariant } from '../components/Toast.tsx'
import { WorkspaceSidebar } from '../components/WorkspaceSidebar.tsx'
import type { AuditLogEntry } from '../types.ts'
import { buildWorkspaceSidebarItems } from '../workspaceSidebarItems.ts'
import './AuditLogView.css'

type AuditActionFilter = 'all' | 'auth' | 'case' | 'export'

interface ToastState {
  variant: ToastVariant
  message: string
}

interface AuditLogViewProps {
  logs: AuditLogEntry[]
  isLoading: boolean
  currentUserName: string
  currentUserRole: string
  canAccess: boolean
  onRefresh: () => Promise<unknown>
  onOpenWorkbench: () => void
  onOpenReview: () => void
  onOpenExport: () => void
  onOpenKnowledge: () => void
  onOpenStates: () => void
}

const actionFilterOptions: Array<{ value: AuditActionFilter; label: string }> = [
  { value: 'all', label: '全部动作' },
  { value: 'auth', label: '登录认证' },
  { value: 'case', label: '用例变更' },
  { value: 'export', label: '导出任务' },
]

function normalizeActionFilter(entry: AuditLogEntry): Exclude<AuditActionFilter, 'all'> {
  if (entry.action.startsWith('auth.')) {
    return 'auth'
  }

  if (entry.action.startsWith('export.')) {
    return 'export'
  }

  return 'case'
}

function formatActionLabel(action: string) {
  const map: Record<string, string> = {
    'auth.login': '登录',
    'case.create': '创建用例',
    'case.update': '更新用例',
    'case.generate_draft': '生成草案',
    'case.review.approve': '审核通过',
    'case.review.reject': '退回草稿',
    'export.create': '创建导出任务',
  }

  return map[action] ?? action
}

function formatTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function stringifyMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(metadata, null, 2)
}

export function AuditLogView({
  logs,
  isLoading,
  currentUserName,
  currentUserRole,
  canAccess,
  onRefresh,
  onOpenWorkbench,
  onOpenReview,
  onOpenExport,
  onOpenKnowledge,
  onOpenStates,
}: AuditLogViewProps) {
  const [keyword, setKeyword] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>('all')
  const [selectedLogId, setSelectedLogId] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toastState, setToastState] = useState<ToastState | null>(null)

  const sidebarItems = useMemo(() => buildWorkspaceSidebarItems({ includeAuditLogs: canAccess }), [canAccess])

  const filteredLogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return logs.filter((entry) => {
      if (actionFilter !== 'all' && normalizeActionFilter(entry) !== actionFilter) {
        return false
      }

      if (!normalizedKeyword) {
        return true
      }

      const haystack = [
        entry.actorName,
        entry.actorRoleLabel,
        entry.action,
        formatActionLabel(entry.action),
        entry.targetType,
        entry.targetId,
        entry.targetTitle,
        entry.detail,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedKeyword)
    })
  }, [actionFilter, keyword, logs])

  const selectedLog = useMemo(() => {
    if (selectedLogId) {
      return filteredLogs.find((entry) => entry.id === selectedLogId) ?? filteredLogs[0] ?? null
    }

    return filteredLogs[0] ?? null
  }, [filteredLogs, selectedLogId])

  useEffect(() => {
    if (!toastState) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastState(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toastState])

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

  async function handleRefresh() {
    if (isRefreshing) {
      return
    }

    setIsRefreshing(true)

    try {
      await onRefresh()
      showToast('success', '审计日志已刷新')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '刷新失败，请稍后重试')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!canAccess) {
    return (
      <div className="audit-page-shell">
        <WorkspaceSidebar
          brandIcon="history"
          brandTitle="亿境测试部"
          brandSubtitle="审计日志"
          items={buildWorkspaceSidebarItems()}
          activeKey="states"
          onSelect={handleSidebarSelect}
          userName={currentUserName}
          userRole={currentUserRole}
        />
        <main className="audit-main">
          <EmptyState
            type="no-permission"
            title="当前账号暂无审计日志访问权限"
            description="审计日志页面仅对管理员开放，用于追踪登录、用例变更、审核与导出等关键操作。"
            actionText="返回工作台"
            onAction={onOpenWorkbench}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="audit-page-shell">
      <WorkspaceSidebar
        brandIcon="history"
        brandTitle="亿境测试部"
        brandSubtitle="审计日志"
        items={sidebarItems}
        activeKey="audit"
        onSelect={handleSidebarSelect}
        userName={currentUserName}
        userRole={currentUserRole}
      />

      <main className="audit-main">
        <header className="audit-header">
          <div>
            <h1>审计日志</h1>
            <p>集中查看登录、用例变更、审核流转与导出任务等关键操作记录。</p>
          </div>
          <div className="audit-header-actions">
            <span className="audit-count-pill">
              当前记录 <strong>{filteredLogs.length}</strong> 条
            </span>
            <button
              className="audit-refresh-button"
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              data-testid="audit-refresh-button"
            >
              <Icon name="refresh" />
              <span>{isRefreshing ? '刷新中...' : '刷新日志'}</span>
            </button>
          </div>
        </header>

        <section className="audit-toolbar">
          <label className="audit-search">
            <Icon name="search" />
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索操作人、动作、目标或详情"
              data-testid="audit-search-input"
            />
          </label>

          <label className="audit-filter">
            <span>动作类型</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as AuditActionFilter)}
              data-testid="audit-action-filter"
            >
              {actionFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {isLoading ? (
          <section className="audit-layout">
            <LoadingSkeleton variant="table-card" />
            <LoadingSkeleton variant="detail-panel" />
          </section>
        ) : filteredLogs.length === 0 ? (
          <section className="audit-empty">
            <EmptyState
              type="no-data"
              title="暂无可展示的审计日志"
              description="可以先调整筛选条件，或在平台执行登录、编辑、审核、导出等操作后再返回查看。"
              actionText="刷新日志"
              onAction={() => void handleRefresh()}
            />
          </section>
        ) : (
          <section className="audit-layout">
            <div className="audit-list-card">
              <div className="audit-list-head">
                <h2>最近操作</h2>
                <span>按时间倒序展示关键事件</span>
              </div>
              <div className="audit-list">
                {filteredLogs.map((entry) => {
                  const isActive = selectedLog?.id === entry.id
                  return (
                    <button
                      key={entry.id}
                      className={`audit-row ${isActive ? 'is-active' : ''}`.trim()}
                      type="button"
                      onClick={() => setSelectedLogId(entry.id)}
                      data-testid={`audit-row-${entry.id}`}
                    >
                      <div className="audit-row-top">
                        <strong>{formatActionLabel(entry.action)}</strong>
                        <span>{formatTimeLabel(entry.createdAt)}</span>
                      </div>
                      <div className="audit-row-meta">
                        <span>{entry.actorName}</span>
                        <span>{entry.targetTitle || entry.targetId || entry.targetType}</span>
                      </div>
                      <p>{entry.detail}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="audit-detail-card" data-testid="audit-detail-panel">
              {selectedLog ? (
                <>
                  <div className="audit-detail-head">
                    <div>
                      <span className="audit-detail-label">动作详情</span>
                      <h2>{formatActionLabel(selectedLog.action)}</h2>
                    </div>
                    <span className="audit-detail-time">{formatTimeLabel(selectedLog.createdAt)}</span>
                  </div>

                  <div className="audit-detail-grid">
                    <article>
                      <span>操作人</span>
                      <strong>{selectedLog.actorName}</strong>
                      <p>{selectedLog.actorRoleLabel}</p>
                    </article>
                    <article>
                      <span>目标对象</span>
                      <strong>{selectedLog.targetTitle || selectedLog.targetId || '未命名目标'}</strong>
                      <p>
                        {selectedLog.targetType} · {selectedLog.targetId || '无 ID'}
                      </p>
                    </article>
                    <article>
                      <span>动作编码</span>
                      <strong>{selectedLog.action}</strong>
                      <p>可用于后端检索与联调排查</p>
                    </article>
                  </div>

                  <div className="audit-detail-block">
                    <span>操作说明</span>
                    <p>{selectedLog.detail}</p>
                  </div>

                  <div className="audit-detail-block">
                    <span>附加元数据</span>
                    <pre>{stringifyMetadata(selectedLog.metadata)}</pre>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {toastState ? <Toast variant={toastState.variant} message={toastState.message} /> : null}
    </div>
  )
}
