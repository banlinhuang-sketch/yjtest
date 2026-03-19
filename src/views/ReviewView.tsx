import { scopeMeta } from '../data.ts'
import { Field, FilterSelect, MetricCard, PageHeader } from '../components/Common.tsx'
import { Icon } from '../components/Icon.tsx'
import { classNames, priorityClass, statusClass } from '../utils.ts'
import type { Priority, Scope, TestCase } from '../types.ts'

const priorityOptions: Array<Priority | 'all'> = ['all', 'P0', 'P1', 'P2']

export function ReviewView({
  cases,
  selectedCaseId,
  onSelectCase,
  onReviewNoteChange,
  onApprove,
  onReject,
  scopeFilter,
  priorityFilter,
  onScopeFilterChange,
  onPriorityFilterChange,
  totalPending,
  approvalRate,
}: {
  cases: TestCase[]
  selectedCaseId: string
  onSelectCase: (caseId: string) => void
  onReviewNoteChange: (value: string) => void
  onApprove: (caseId: string) => void
  onReject: (caseId: string) => void
  scopeFilter: Scope | 'all'
  priorityFilter: Priority | 'all'
  onScopeFilterChange: (value: Scope | 'all') => void
  onPriorityFilterChange: (value: Priority | 'all') => void
  totalPending: number
  approvalRate: number
}) {
  const activeCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0]

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="P3 / 审核中心"
        title="用例审核中心"
        description="保留 Stitch 的双栏审核布局，用真实待审用例驱动列表和预览抽屉。"
      />

      <div className="metric-grid">
        <MetricCard
          label="待审核用例"
          value={String(totalPending)}
          note="按最新筛选条件实时更新"
          icon="pending_actions"
        />
        <MetricCard
          label="平均通过率"
          value={`${approvalRate}%`}
          note="按当前样例数据估算"
          icon="verified"
          tone="success"
        />
      </div>

      <section className="filter-card card">
        <div className="filter-row">
          <FilterSelect
            label="审核范围"
            value={scopeFilter}
            onChange={(event) =>
              onScopeFilterChange(event.target.value as Scope | 'all')
            }
            options={[
              { label: '全部范围', value: 'all' },
              ...(Object.keys(scopeMeta) as Scope[]).map((scope) => ({
                label: scopeMeta[scope].label,
                value: scope,
              })),
            ]}
          />
          <FilterSelect
            label="优先级"
            value={priorityFilter}
            onChange={(event) =>
              onPriorityFilterChange(event.target.value as Priority | 'all')
            }
            options={priorityOptions.map((option) => ({
              label: option === 'all' ? '全部优先级' : option,
              value: option,
            }))}
          />
        </div>
      </section>

      <div className="split-layout">
        <section className="card table-card">
          <table className="review-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用例名称</th>
                <th>优先级</th>
                <th>提交人</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr
                  key={item.id}
                  className={classNames(item.id === activeCase?.id && 'review-row-active')}
                  onClick={() => onSelectCase(item.id)}
                >
                  <td>{item.id}</td>
                  <td>{item.title}</td>
                  <td>
                    <span className={classNames('badge', priorityClass(item.priority))}>
                      {item.priority}
                    </span>
                  </td>
                  <td>{item.submitter}</td>
                  <td>
                    <span className={classNames('status-chip', statusClass(item.status))}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cases.length ? (
            <div className="table-empty">
              <Icon name="inbox" className="empty-icon" />
              <strong>当前没有待审核用例</strong>
              <p>可以切换筛选条件，或先回到详情页补充草稿内容。</p>
            </div>
          ) : null}
        </section>

        <aside className="card preview-card">
          {activeCase ? (
            <>
              <div className="preview-head">
                <h4>用例详情预览</h4>
                <button type="button" className="icon-button">
                  <Icon name="close" />
                </button>
              </div>

              <div className="preview-body">
                <div>
                  <p className="field-label">用例 ID / 名称</p>
                  <h4>{activeCase.id}</h4>
                  <p className="muted">{activeCase.title}</p>
                </div>

                <div className="preview-grid">
                  <div>
                    <p className="field-label">所属模块</p>
                    <strong>{activeCase.feature}</strong>
                  </div>
                  <div>
                    <p className="field-label">前置条件</p>
                    <strong>{activeCase.preconditions[0]}</strong>
                  </div>
                </div>

                <div>
                  <p className="field-label">测试步骤</p>
                  <div className="preview-steps">
                    {activeCase.steps.map((step, index) => (
                      <div className="preview-step" key={`${activeCase.id}-preview-${index}`}>
                        <span>{index + 1}</span>
                        <p>{step.action}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Field label="审核备注">
                  <textarea
                    rows={5}
                    value={activeCase.reviewNote}
                    onChange={(event) => onReviewNoteChange(event.target.value)}
                    placeholder="输入审核意见或驳回原因"
                  />
                </Field>
              </div>

              <div className="preview-actions">
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => onReject(activeCase.id)}
                >
                  <Icon name="cancel" />
                  <span>驳回</span>
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => onApprove(activeCase.id)}
                >
                  <Icon name="check_circle" />
                  <span>通过</span>
                </button>
              </div>
            </>
          ) : (
            <div className="table-empty">
              <Icon name="rate_review" className="empty-icon" />
              <strong>暂无可预览的审核内容</strong>
              <p>当列表中出现待审核用例时，这里会展示右侧快捷预览。</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
