import type { ReactNode } from 'react'
import { scopeMeta } from '../data.ts'
import { Field, PageHeader } from '../components/Common.tsx'
import { Icon } from '../components/Icon.tsx'
import { EmptyStateView } from './EmptyStateView.tsx'
import { attachmentIcon, classNames, priorityClass } from '../utils.ts'
import type { Scope, TestCase } from '../types.ts'

export function EditorView({
  cases,
  selectedCase,
  selectedCaseId,
  draftScope,
  draftTitle,
  draftFeature,
  draftRequirement,
  lastGeneratedCaseId,
  lastGenerationSummary,
  onSelectCase,
  onDraftScopeChange,
  onDraftTitleChange,
  onDraftFeatureChange,
  onDraftRequirementChange,
  onGenerateDraft,
  onResetDraft,
  onFieldChange,
  onPreconditionChange,
  onAddPrecondition,
  onRemovePrecondition,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onSave,
  topActions,
}: {
  cases: TestCase[]
  selectedCase: TestCase | undefined
  selectedCaseId: string
  draftScope: Scope
  draftTitle: string
  draftFeature: string
  draftRequirement: string
  lastGeneratedCaseId: string
  lastGenerationSummary: string
  onSelectCase: (caseId: string) => void
  onDraftScopeChange: (scope: Scope) => void
  onDraftTitleChange: (value: string) => void
  onDraftFeatureChange: (value: string) => void
  onDraftRequirementChange: (value: string) => void
  onGenerateDraft: () => void
  onResetDraft: () => void
  onFieldChange: <K extends keyof TestCase>(field: K, value: TestCase[K]) => void
  onPreconditionChange: (index: number, value: string) => void
  onAddPrecondition: () => void
  onRemovePrecondition: (index: number) => void
  onStepChange: (
    index: number,
    field: 'action' | 'expected' | 'evidence',
    value: string,
  ) => void
  onAddStep: () => void
  onRemoveStep: (index: number) => void
  onSave: () => void
  topActions: ReactNode
}) {
  if (!selectedCase) {
    return (
      <EmptyStateView
        onOpenWorkbench={() => undefined}
        onOpenReview={() => undefined}
        onOpenExport={() => undefined}
        onOpenKnowledge={() => undefined}
      />
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="P2 / 用例详情编辑"
        title={selectedCase.title}
        description="基于 Stitch 详情页样式，保留真实字段编辑、步骤维护、附件和动态信息。"
        actions={topActions}
      />

      <section className="card composer-card">
        <div className="card-head">
          <h4>
            <Icon name="auto_awesome" className="text-primary" />
            <span>PRD 输入与草案生成</span>
          </h4>
          <div className="composer-actions">
            <button type="button" className="button button-ghost" onClick={onResetDraft}>
              <Icon name="restart_alt" />
              <span>重置输入</span>
            </button>
            <button type="button" className="button button-primary" onClick={onGenerateDraft}>
              <Icon name="psychology" />
              <span>生成草案</span>
            </button>
          </div>
        </div>

        <div className="composer-grid">
          <Field label="生成范围">
            <select
              value={draftScope}
              onChange={(event) => onDraftScopeChange(event.target.value as Scope)}
            >
              {(Object.keys(scopeMeta) as Scope[]).map((scope) => (
                <option key={scope} value={scope}>
                  {scopeMeta[scope].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="模块">
            <input
              value={draftFeature}
              onChange={(event) => onDraftFeatureChange(event.target.value)}
              placeholder="例如：通知联动 / 配对链路 / 低电量提示"
            />
          </Field>
          <Field label="草案标题">
            <input
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
              placeholder="例如：断连重连后消息队列补发"
            />
          </Field>
        </div>

        <Field label="PRD 摘要">
          <textarea
            rows={5}
            value={draftRequirement}
            onChange={(event) => onDraftRequirementChange(event.target.value)}
            placeholder="粘贴 PRD 摘要、设计说明或历史缺陷背景，系统会生成测试用例草案。"
          />
        </Field>

        <div className="composer-foot">
          <div className="composer-hints">
            <span className={classNames('badge', scopeMeta[draftScope].badgeClass)}>
              {scopeMeta[draftScope].label}
            </span>
            {scopeMeta[draftScope].lenses.map((item) => (
              <span key={item} className="composer-pill">
                {item}
              </span>
            ))}
          </div>

          {lastGenerationSummary ? (
            <div className="composer-result">
              <strong>{lastGeneratedCaseId || '最新草案'}</strong>
              <p>{lastGenerationSummary}</p>
            </div>
          ) : (
            <p className="muted composer-placeholder">
              输入 PRD 后点击“生成草案”，系统会自动创建新用例并跳转到可编辑状态。
            </p>
          )}
        </div>
      </section>

      <section className="editor-hero card">
        <div className="editor-hero-left">
          <button type="button" className="icon-button">
            <Icon name="arrow_back" />
          </button>
          <div className="editor-hero-copy">
            <div className="hero-title-row">
              <span className={classNames('badge', priorityClass(selectedCase.priority))}>
                {selectedCase.priority}
              </span>
              <h4>{selectedCase.title}</h4>
            </div>
            <p className="muted">
              {selectedCase.id} · 最后更新 {selectedCase.updatedAtLabel}
            </p>
          </div>
        </div>

        <div className="editor-hero-actions">
          <label className="status-select">
            <select
              value={selectedCase.status}
              onChange={(event) =>
                onFieldChange('status', event.target.value as TestCase['status'])
              }
            >
              <option value="草稿">草稿</option>
              <option value="待审核">待审核</option>
              <option value="已沉淀">已沉淀</option>
            </select>
          </label>
          <button type="button" className="button button-primary" onClick={onSave}>
            <Icon name="save" />
            <span>保存用例</span>
          </button>
        </div>
      </section>

      <div className="editor-layout">
        <div className="editor-main">
          <section className="card">
            <div className="card-head">
              <h4>
                <Icon name="info" className="text-primary" />
                <span>基本信息</span>
              </h4>
            </div>
            <div className="form-grid">
              <Field label="所属模块">
                <input
                  value={selectedCase.feature}
                  onChange={(event) => onFieldChange('feature', event.target.value)}
                />
              </Field>
              <Field label="负责人">
                <input
                  value={selectedCase.owner}
                  onChange={(event) => onFieldChange('owner', event.target.value)}
                />
              </Field>
              <Field label="优先级">
                <select
                  value={selectedCase.priority}
                  onChange={(event) =>
                    onFieldChange('priority', event.target.value as TestCase['priority'])
                  }
                >
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                </select>
              </Field>
              <Field label="范围">
                <select
                  value={selectedCase.scope}
                  onChange={(event) =>
                    onFieldChange('scope', event.target.value as TestCase['scope'])
                  }
                >
                  {(Object.keys(scopeMeta) as Scope[]).map((scope) => (
                    <option key={scope} value={scope}>
                      {scopeMeta[scope].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="提交人">
                <input
                  value={selectedCase.submitter}
                  onChange={(event) => onFieldChange('submitter', event.target.value)}
                />
              </Field>
              <Field label="标签">
                <input
                  value={selectedCase.tags.join(' / ')}
                  onChange={(event) =>
                    onFieldChange(
                      'tags',
                      event.target.value
                        .split(/[、,/]/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h4>
                <Icon name="description" className="text-primary" />
                <span>用例描述</span>
              </h4>
            </div>

            <div className="field-stack">
              <Field label="测试目标">
                <textarea
                  rows={4}
                  value={selectedCase.objective}
                  onChange={(event) => onFieldChange('objective', event.target.value)}
                />
              </Field>

              <Field label="补充说明">
                <textarea
                  rows={4}
                  value={selectedCase.notes}
                  onChange={(event) => onFieldChange('notes', event.target.value)}
                />
              </Field>

              <div className="editor-list">
                <div className="card-head compact">
                  <h4>前置条件</h4>
                  <button type="button" className="button button-ghost" onClick={onAddPrecondition}>
                    <Icon name="add" />
                    <span>新增条件</span>
                  </button>
                </div>
                {selectedCase.preconditions.map((entry, index) => (
                  <div className="list-row" key={`${selectedCase.id}-precondition-${index}`}>
                    <span className="list-index">{index + 1}</span>
                    <textarea
                      rows={2}
                      value={entry}
                      onChange={(event) => onPreconditionChange(index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-button subtle-danger"
                      onClick={() => onRemovePrecondition(index)}
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head compact">
              <h4>
                <Icon name="format_list_numbered" className="text-primary" />
                <span>测试步骤</span>
              </h4>
              <button type="button" className="button button-ghost" onClick={onAddStep}>
                <Icon name="add_circle" />
                <span>插入步骤</span>
              </button>
            </div>

            <div className="table-wrap">
              <table className="step-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>测试步骤</th>
                    <th>预期结果</th>
                    <th>测试证据</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCase.steps.map((step, index) => (
                    <tr key={`${selectedCase.id}-step-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <textarea
                          rows={2}
                          value={step.action}
                          onChange={(event) => onStepChange(index, 'action', event.target.value)}
                        />
                      </td>
                      <td>
                        <textarea
                          rows={2}
                          value={step.expected}
                          onChange={(event) =>
                            onStepChange(index, 'expected', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          rows={2}
                          value={step.evidence}
                          onChange={(event) =>
                            onStepChange(index, 'evidence', event.target.value)
                          }
                        />
                      </td>
                      <td className="table-action">
                        <button
                          type="button"
                          className="icon-button subtle-danger"
                          onClick={() => onRemoveStep(index)}
                        >
                          <Icon name="delete" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="editor-side">
          <section className="card">
            <div className="card-head">
              <h4>
                <Icon name="image" className="text-primary" />
                <span>相关附件</span>
              </h4>
            </div>
            <div className="upload-box">
              <Icon name="cloud_upload" className="upload-icon" />
              <strong>点击或拖拽上传</strong>
              <p>原型阶段先展示附件列表，不接入真实上传接口。</p>
            </div>
            <div className="attachment-list">
              {selectedCase.attachments.length ? (
                selectedCase.attachments.map((attachment) => (
                  <div className="attachment-row" key={attachment.name}>
                    <span className="attachment-icon">
                      <Icon name={attachmentIcon(attachment.kind)} />
                    </span>
                    <span className="attachment-name">{attachment.name}</span>
                  </div>
                ))
              ) : (
                <p className="muted">当前用例还没有附件。</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h4>
                <Icon name="history" className="text-primary" />
                <span>更新动态</span>
              </h4>
            </div>
            <div className="timeline">
              {selectedCase.activity.map((entry) => (
                <div className="timeline-row" key={`${entry.time}-${entry.detail}`}>
                  <span className={classNames('timeline-dot', `timeline-${entry.tone}`)} />
                  <div>
                    <strong>{entry.time}</strong>
                    <p>{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h4>
                <Icon name="inventory_2" className="text-primary" />
                <span>切换用例</span>
              </h4>
            </div>
            <div className="case-mini-list">
              {cases.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={classNames(
                    'case-mini-item',
                    item.id === selectedCaseId && 'case-mini-item-active',
                  )}
                  onClick={() => onSelectCase(item.id)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.id} · {item.updatedAtLabel}
                    </p>
                  </div>
                  <span className={classNames('badge', scopeMeta[item.scope].badgeClass)}>
                    {scopeMeta[item.scope].label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
