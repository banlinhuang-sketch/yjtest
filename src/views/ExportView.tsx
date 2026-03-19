import { CheckRow, FilterSelect, PageHeader } from '../components/Common.tsx'
import { Icon } from '../components/Icon.tsx'
import { scopeMeta } from '../data.ts'
import { classNames, priorityClass } from '../utils.ts'
import type { ExportFormat, Priority, Scope, Status, TestCase } from '../types.ts'

const statusOptions: Array<Status | 'all'> = ['all', '草稿', '待审核', '已沉淀']
const priorityOptions: Array<Priority | 'all'> = ['all', 'P0', 'P1', 'P2']

export function ExportView({
  cases,
  exportScope,
  exportStatus,
  exportPriority,
  exportTag,
  exportPeriod,
  onScopeChange,
  onStatusChange,
  onPriorityChange,
  onTagChange,
  onPeriodChange,
  tagOptions,
  exportFormat,
  includeSteps,
  includePreconditions,
  dedupeCases,
  onExportFormatChange,
  onIncludeStepsChange,
  onIncludePreconditionsChange,
  onDedupeCasesChange,
  onExport,
  lastExportMessage,
}: {
  cases: TestCase[]
  exportScope: Scope | 'all'
  exportStatus: Status | 'all'
  exportPriority: Priority | 'all'
  exportTag: string
  exportPeriod: '最近 7 天' | '最近 30 天' | '全部时间'
  onScopeChange: (value: Scope | 'all') => void
  onStatusChange: (value: Status | 'all') => void
  onPriorityChange: (value: Priority | 'all') => void
  onTagChange: (value: string) => void
  onPeriodChange: (value: '最近 7 天' | '最近 30 天' | '全部时间') => void
  tagOptions: string[]
  exportFormat: ExportFormat
  includeSteps: boolean
  includePreconditions: boolean
  dedupeCases: boolean
  onExportFormatChange: (value: ExportFormat) => void
  onIncludeStepsChange: (value: boolean) => void
  onIncludePreconditionsChange: (value: boolean) => void
  onDedupeCasesChange: (value: boolean) => void
  onExport: () => void
  lastExportMessage: string
}) {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="P4 / 导出中心"
        title="导出中心"
        description={`当前共有 ${cases.length} 条符合条件的用例，可导出为 Excel 兼容 CSV 或 Word 兼容 Markdown。`}
      />

      <section className="card">
        <div className="card-head">
          <h4>
            <Icon name="filter_list" className="text-primary" />
            <span>筛选条件</span>
          </h4>
        </div>
        <div className="filter-grid five">
          <FilterSelect
            label="用例范围"
            value={exportScope}
            onChange={(event) => onScopeChange(event.target.value as Scope | 'all')}
            options={[
              { label: '全部项目', value: 'all' },
              ...(Object.keys(scopeMeta) as Scope[]).map((scope) => ({
                label: scopeMeta[scope].label,
                value: scope,
              })),
            ]}
          />
          <FilterSelect
            label="状态"
            value={exportStatus}
            onChange={(event) => onStatusChange(event.target.value as Status | 'all')}
            options={statusOptions.map((status) => ({
              label: status === 'all' ? '全部状态' : status,
              value: status,
            }))}
          />
          <FilterSelect
            label="优先级"
            value={exportPriority}
            onChange={(event) => onPriorityChange(event.target.value as Priority | 'all')}
            options={priorityOptions.map((option) => ({
              label: option === 'all' ? '全部优先级' : option,
              value: option,
            }))}
          />
          <FilterSelect
            label="标签"
            value={exportTag}
            onChange={(event) => onTagChange(event.target.value)}
            options={tagOptions.map((item) => ({
              label: item,
              value: item,
            }))}
          />
          <FilterSelect
            label="更新时间"
            value={exportPeriod}
            onChange={(event) =>
              onPeriodChange(event.target.value as '最近 7 天' | '最近 30 天' | '全部时间')
            }
            options={[
              { label: '最近 7 天', value: '最近 7 天' },
              { label: '最近 30 天', value: '最近 30 天' },
              { label: '全部时间', value: '全部时间' },
            ]}
          />
        </div>
      </section>

      <div className="split-layout export-layout">
        <section className="card table-card">
          <div className="card-head compact">
            <h4>
              <Icon name="preview" className="text-primary" />
              <span>待导出用例预览</span>
            </h4>
            <span className="small-note">显示全部 {cases.length} 条</span>
          </div>

          <table className="review-table export-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用例名称</th>
                <th>优先级</th>
                <th>最后更新</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.title}</td>
                  <td>
                    <span className={classNames('badge', priorityClass(item.priority))}>
                      {item.priority}
                    </span>
                  </td>
                  <td>{item.updatedAtLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!cases.length ? (
            <div className="table-empty">
              <Icon name="folder_open" className="empty-icon" />
              <strong>当前筛选条件下没有可导出的内容</strong>
              <p>调整范围、状态或标签后，这里会恢复预览列表。</p>
            </div>
          ) : null}
        </section>

        <aside className="card config-card">
          <div className="card-head">
            <h4>
              <Icon name="settings_applications" className="text-primary" />
              <span>导出配置</span>
            </h4>
          </div>

          <div className="format-grid">
            <label
              className={classNames(
                'format-option',
                exportFormat === 'excel' && 'format-option-active',
              )}
            >
              <input
                type="radio"
                checked={exportFormat === 'excel'}
                onChange={() => onExportFormatChange('excel')}
              />
              <Icon name="description" />
              <span>Excel 兼容 CSV</span>
            </label>
            <label
              className={classNames(
                'format-option',
                exportFormat === 'word' && 'format-option-active',
              )}
            >
              <input
                type="radio"
                checked={exportFormat === 'word'}
                onChange={() => onExportFormatChange('word')}
              />
              <Icon name="article" />
              <span>Word 兼容 Markdown</span>
            </label>
          </div>

          <div className="check-stack">
            <CheckRow
              checked={includeSteps}
              onChange={(event) => onIncludeStepsChange(event.target.checked)}
              label="包含步骤与预期详情"
            />
            <CheckRow
              checked={includePreconditions}
              onChange={(event) => onIncludePreconditionsChange(event.target.checked)}
              label="包含前置条件与附件说明"
            />
            <CheckRow
              checked={dedupeCases}
              onChange={(event) => onDedupeCasesChange(event.target.checked)}
              label="按标题合并重复用例"
            />
          </div>

          <button type="button" className="button button-primary block" onClick={onExport}>
            <Icon name="download" />
            <span>立即开始导出</span>
          </button>

          <p className="helper-copy">
            当前实现会直接下载本地文件，方便你在静态前端阶段先验证筛选与导出口径。
          </p>

          {lastExportMessage ? <p className="export-feedback">{lastExportMessage}</p> : null}
        </aside>
      </div>
    </div>
  )
}
