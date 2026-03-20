import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '../components/EmptyState.tsx'
import { Icon } from '../components/Icon.tsx'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '../components/WorkspaceSidebar.tsx'
import type { StatePresetId } from '../globalStates.ts'
import { buildWorkspaceSidebarItems } from '../workspaceSidebarItems.ts'
import './EmptyStateView.css'

const sidebarItems: WorkspaceSidebarItem[] = [
  { key: 'workbench', label: 'P1 工作台', icon: 'dashboard' },
  { key: 'review', label: 'P3 审核中心', icon: 'fact_check' },
  { key: 'export', label: 'P4 导出中心', icon: 'file_export' },
  { key: 'knowledge', label: 'P5 知识基线', icon: 'menu_book' },
  { key: 'states', label: 'P6 状态模板', icon: 'tips_and_updates', sectionLabel: '系统' },
]

const presetMap: Record<
  StatePresetId,
  {
    type: 'no-data' | 'error' | 'no-permission' | 'network' | 'session-expired'
    label: string
    title: string
    description: string
    actionText: string
    tips: string[]
  }
> = {
  'session-expired': {
    type: 'session-expired',
    label: '登录失效',
    title: '当前登录状态已失效，请重新登录后继续操作',
    description: '适用于会话过期、令牌失效或账号切换后需要重新认证的场景。',
    actionText: '重新登录',
    tips: ['优先引导用户回到登录页', '避免把会话失效和网络异常混淆'],
  },
  'no-data': {
    type: 'no-data',
    label: '无数据',
    title: '当前还没有可展示的数据',
    description: '适用于首次进入系统、尚未创建测试用例或知识源尚未完成同步的场景。',
    actionText: '返回工作台',
    tips: ['用于初始空仓场景', '主文案应引导用户采取下一步动作'],
  },
  'filtered-empty': {
    type: 'no-data',
    label: '筛选无结果',
    title: '没有符合筛选条件的结果',
    description: '适用于列表、导出和审核页在开启搜索或多条件筛选后没有命中数据的场景。',
    actionText: '重置筛选',
    tips: ['避免误用系统异常文案', '按钮应引导用户回到可操作状态'],
  },
  'no-permission': {
    type: 'no-permission',
    label: '无权限',
    title: '当前账号暂时无权访问该页面',
    description: '适用于角色权限不足、菜单未授权或组织范围受限的场景。',
    actionText: '返回工作台',
    tips: ['文案尽量中性，不暴露内部权限模型', '允许用户回到安全页面'],
  },
  error: {
    type: 'error',
    label: '系统异常',
    title: '页面暂时不可用，请稍后再试',
    description: '适用于服务端异常、关键接口失败或数据解析中断时的统一兜底状态。',
    actionText: '重新加载',
    tips: ['不要直接暴露 Error 500', '保留重试动作和人工排查入口'],
  },
  network: {
    type: 'network',
    label: '网络异常',
    title: '网络连接不稳定，请检查后重试',
    description: '适用于用户离线、接口超时或内网环境抖动导致的数据加载失败。',
    actionText: '重新连接',
    tips: ['优先提示网络原因', '按钮动作推荐为重试或重新连接'],
  },
}

interface EmptyStateViewProps {
  onOpenWorkbench: () => void
  onOpenReview: () => void
  onOpenExport: () => void
  onOpenKnowledge: () => void
  onOpenAuditLogs?: () => void
  canOpenAuditLogs?: boolean
  currentUserName?: string
  currentUserRole?: string
  initialPreset?: StatePresetId
  onPrimaryAction?: () => void
  headerTitle?: string
  headerDescription?: string
}

export function EmptyStateView({
  onOpenWorkbench,
  onOpenReview,
  onOpenExport,
  onOpenKnowledge,
  onOpenAuditLogs,
  canOpenAuditLogs = false,
  currentUserName = 'Banlin Huang',
  currentUserRole = '设计验收',
  initialPreset = 'no-data',
  onPrimaryAction,
  headerTitle,
  headerDescription,
}: EmptyStateViewProps) {
  const [activePreset, setActivePreset] = useState<StatePresetId>(initialPreset)

  const preset = useMemo(() => presetMap[activePreset], [activePreset])
  const visibleSidebarItems = useMemo(
    () => (canOpenAuditLogs ? buildWorkspaceSidebarItems({ includeAuditLogs: true }) : sidebarItems),
    [canOpenAuditLogs],
  )

  useEffect(() => {
    setActivePreset(initialPreset)
  }, [initialPreset])

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

    if (nextKey === 'audit' && onOpenAuditLogs) {
      onOpenAuditLogs()
    }
  }

  return (
    <div className="state-page-shell">
      <WorkspaceSidebar
        brandIcon="tips_and_updates"
        brandTitle="亿境测试部"
        brandSubtitle="P6 状态模板"
        items={visibleSidebarItems}
        activeKey="states"
        onSelect={handleSidebarSelect}
        userName={currentUserName}
        userRole={currentUserRole}
        theme="dark"
      />

      <main className="state-main">
        <header className="state-header">
          <div>
            <h1>{headerTitle ?? '空状态 / 异常状态模板'}</h1>
            <p>{headerDescription ?? '统一管理登录失效、无数据、筛选无结果、无权限、系统异常与网络异常六类页面状态。'}</p>
          </div>
          <div className="state-header-badge">
            <Icon name="fact_check" />
            <span>全局组件已接入 P1 / P4 / P5</span>
          </div>
        </header>

        <section className="state-layout">
          <aside className="state-panel">
            <h2>状态类型</h2>
            <div className="state-preset-list">
              {(Object.keys(presetMap) as StatePresetId[]).map((presetId) => (
                <button
                  key={presetId}
                  className={`state-preset-item ${activePreset === presetId ? 'is-active' : ''}`.trim()}
                  type="button"
                  onClick={() => setActivePreset(presetId)}
                >
                  <strong>{presetMap[presetId].label}</strong>
                  <span>{presetMap[presetId].description}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="state-preview-panel">
            <div className="state-preview-card">
              <EmptyState
                type={preset.type}
                title={preset.title}
                description={preset.description}
                actionText={preset.actionText}
                onAction={onPrimaryAction ?? onOpenWorkbench}
              />
            </div>

            <div className="state-guideline-card">
              <h3>
                <Icon name="rule" />
                使用说明
              </h3>
              <ul>
                {preset.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}
