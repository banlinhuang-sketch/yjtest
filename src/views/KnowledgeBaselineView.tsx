import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { LoadingSkeleton } from '../components/LoadingSkeleton.tsx'
import { Toast } from '../components/Toast.tsx'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '../components/WorkspaceSidebar.tsx'
import type { KnowledgeResource } from '../types.ts'
import { buildWorkspaceSidebarItems } from '../workspaceSidebarItems.ts'
import './KnowledgeBaselineView.css'

const sidebarItems: WorkspaceSidebarItem[] = [
  { key: 'workbench', label: 'P1 工作台', icon: 'dashboard' },
  { key: 'review', label: 'P3 审核中心', icon: 'fact_check' },
  { key: 'export', label: 'P4 导出中心', icon: 'file_export' },
  { key: 'knowledge', label: 'P5 知识基线', icon: 'menu_book' },
  { key: 'states', label: 'P6 状态模板', icon: 'tips_and_updates', sectionLabel: '系统' },
]

function KnowledgeCard({ item }: { item: KnowledgeResource }) {
  return (
    <article className="knowledge-card">
      <div>
        <div className={`knowledge-card-icon ${item.accent}`}>
          <Icon name={item.icon} />
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
      <div className="knowledge-card-footer">
        <span>
          {item.categoryLabel} · 最近更新：{item.updatedAt}
        </span>
        <button type="button">查看详情</button>
      </div>
    </article>
  )
}

interface KnowledgeBaselineViewProps {
  sources: KnowledgeResource[]
  isLoading: boolean
  onSyncAll: () => Promise<unknown>
  onOpenWorkbench: () => void
  onOpenReview: () => void
  onOpenExport: () => void
  onOpenStates: () => void
  onOpenAuditLogs: () => void
  canOpenAuditLogs?: boolean
  currentUserName?: string
  currentUserRole?: string
}

export function KnowledgeBaselineView({
  sources,
  isLoading,
  onSyncAll,
  onOpenWorkbench,
  onOpenReview,
  onOpenExport,
  onOpenStates,
  onOpenAuditLogs,
  canOpenAuditLogs = false,
  currentUserName = 'Banlin Huang',
  currentUserRole = '知识基线管理员',
}: KnowledgeBaselineViewProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const visibleSidebarItems = useMemo(
    () => (canOpenAuditLogs ? buildWorkspaceSidebarItems({ includeAuditLogs: true }) : sidebarItems),
    [canOpenAuditLogs],
  )

  const readyCount = useMemo(() => sources.length, [sources])

  useEffect(() => {
    if (!toastMessage) {
      return undefined
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

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

    if (nextKey === 'audit') {
      onOpenAuditLogs()
      return
    }

    if (nextKey === 'states') {
      onOpenStates()
    }
  }

  async function handleSyncAll() {
    if (isSyncing) {
      return
    }

    setIsSyncing(true)

    try {
      await onSyncAll()
      setToastMessage('知识基线已完成同步')
    } catch {
      // Global fallback is handled by the app shell.
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="knowledge-page-shell">
      <WorkspaceSidebar
        brandIcon="shield"
        brandTitle="亿境测试部"
        items={visibleSidebarItems}
        activeKey="knowledge"
        onSelect={handleSidebarSelect}
        userName={currentUserName}
        userRole={currentUserRole}
        theme="dark"
      />

      <main className="knowledge-main">
        <header className="knowledge-header">
          <div className="knowledge-header-title">
            <h1>知识基线</h1>
            <span>已接真实接口</span>
          </div>
          <p>当前页面展示平台生成草案依赖的 App 业务规则、硬件能力、联动链路与历史沉淀，并支持统一同步刷新。</p>
        </header>

        {isLoading ? (
          <section className="knowledge-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={`knowledge-skeleton-${index}`} variant="knowledge-card" />
            ))}
          </section>
        ) : sources.length ? (
          <section className="knowledge-grid">
            {sources.map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </section>
        ) : (
          <EmptyState
            type="no-data"
            title="暂无知识基线"
            description="当前还没有同步到任何知识源。你可以先触发一次全量同步，或联系平台管理员检查知识接口。"
            actionText={isSyncing ? '同步中...' : '同步全部资源'}
            onAction={() => void handleSyncAll()}
          />
        )}

        <footer className="knowledge-footer">
          <div className="knowledge-footer-copy">
            <p>
              <strong>知识来源说明:</strong> 一期已改为真实只读接口，当前知识源来自后端统一聚合结果。
            </p>
            <p>
              <strong>当前资产规模:</strong> 平台共维护 {readyCount} 个知识源，支持工作台、审核和导出链路复用。
            </p>
          </div>

          <button className="knowledge-sync-button" type="button" onClick={() => void handleSyncAll()} disabled={isSyncing}>
            <Icon name="sync" />
            <span>{isSyncing ? '同步中...' : '同步全部资源'}</span>
          </button>
        </footer>
      </main>

      {toastMessage ? <Toast variant="success" message={toastMessage} /> : null}
    </div>
  )
}
