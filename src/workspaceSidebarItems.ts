import type { WorkspaceSidebarItem } from './components/WorkspaceSidebar.tsx'

export function buildWorkspaceSidebarItems(options: { includeAuditLogs?: boolean } = {}): WorkspaceSidebarItem[] {
  const items: WorkspaceSidebarItem[] = [
    { key: 'workbench', label: 'P1 工作台', icon: 'dashboard' },
    { key: 'review', label: 'P3 审核中心', icon: 'fact_check' },
    { key: 'export', label: 'P4 导出中心', icon: 'file_export' },
    { key: 'knowledge', label: 'P5 知识基线', icon: 'menu_book' },
  ]

  if (options.includeAuditLogs) {
    items.push({ key: 'audit', label: '审计日志', icon: 'history' })
  }

  items.push({ key: 'states', label: 'P6 状态模板', icon: 'tips_and_updates', sectionLabel: '系统' })

  return items
}
