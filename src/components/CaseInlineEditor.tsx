import { useMemo, useState } from 'react'

import {
  buildCaseFormStateFromCase,
  buildTestCaseFromFormState,
  createStructuredItem,
  parseTagsInput,
  type CaseFormState,
  type StructuredFieldKey,
  updateStructuredItems,
} from '../caseFormAdapters.ts'
import type { TestCase } from '../types.ts'
import { EmptyState } from './EmptyState.tsx'
import { Icon } from './Icon.tsx'
import { StructuredListEditor } from './StructuredListEditor.tsx'

interface CaseInlineEditorProps {
  item: TestCase | null
  onOpenFullEditor: () => void
  onCommit: (nextCase: TestCase, detail: string) => void
}

function updateStructuredField(
  state: CaseFormState,
  field: StructuredFieldKey,
  updater: (items: CaseFormState[StructuredFieldKey]) => CaseFormState[StructuredFieldKey],
) {
  return {
    ...state,
    [field]: updater(state[field]),
  }
}

export function CaseInlineEditor({
  item,
  onOpenFullEditor,
  onCommit,
}: CaseInlineEditorProps) {
  const [formState, setFormState] = useState<CaseFormState | null>(() =>
    item ? buildCaseFormStateFromCase(item) : null,
  )

  const structuredStats = useMemo(
    () =>
      formState
        ? {
            preconditions: formState.preconditions.length,
            steps: formState.steps.length,
            expected: formState.expected.length,
            evidence: formState.evidence.length,
          }
        : null,
    [formState],
  )

  function commit(nextState: CaseFormState, detail: string) {
    if (!item) {
      return
    }

    setFormState(nextState)
    onCommit(buildTestCaseFromFormState(nextState, item, item.updatedAtLabel), detail)
  }

  function updateField<K extends keyof CaseFormState>(field: K, value: CaseFormState[K]) {
    if (!formState) {
      return
    }

    commit({ ...formState, [field]: value }, '工作台更新了用例内容。')
  }

  function addStructuredField(field: StructuredFieldKey) {
    if (!formState) {
      return
    }

    const nextState = updateStructuredField(formState, field, (items) =>
      updateStructuredItems(items, (current) => [...current, createStructuredItem(field)], field),
    )

    commit(nextState, '工作台补充了一条结构化内容。')
  }

  function removeStructuredField(field: StructuredFieldKey, itemId: string) {
    if (!formState) {
      return
    }

    const nextState = updateStructuredField(formState, field, (items) =>
      updateStructuredItems(
        items,
        (current) => (current.length === 1 ? current : current.filter((entry) => entry.id !== itemId)),
        field,
      ),
    )

    commit(nextState, '工作台删除了一条结构化内容。')
  }

  function changeStructuredField(field: StructuredFieldKey, itemId: string, value: string) {
    if (!formState) {
      return
    }

    const nextState = updateStructuredField(formState, field, (items) =>
      items.map((entry) => (entry.id === itemId ? { ...entry, content: value } : entry)),
    )

    commit(nextState, '工作台更新了一条结构化内容。')
  }

  if (!item || !formState || !structuredStats) {
    return (
      <section className="inline-editor-card inline-editor-empty">
        <EmptyState
          type="no-data"
          title="请选择一条用例开始编辑"
          description="工作台右侧会展示完整内联编辑区。生成草案后也会自动在这里打开，方便继续补充结构化内容。"
          actionText="等待选择"
          onAction={() => undefined}
        />
      </section>
    )
  }

  return (
    <section className="inline-editor-card">
      <div className="inline-editor-toolbar">
        <div>
          <span className="section-label">内联编辑器</span>
          <h4>{item.title || '未命名用例'}</h4>
          <p>
            {item.id} · 最近更新 {item.updatedAtLabel}
          </p>
        </div>
        <button className="inline-editor-open" type="button" onClick={onOpenFullEditor}>
          <Icon name="open_in_full" />
          <span>进入 P2 全屏编辑</span>
        </button>
      </div>

      <div className="inline-editor-grid">
        <label className="inline-editor-field inline-editor-field-span-2">
          <span>用例标题</span>
          <input type="text" value={formState.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>

        <label className="inline-editor-field">
          <span>所属模块</span>
          <input type="text" value={formState.feature} onChange={(event) => updateField('feature', event.target.value)} />
        </label>

        <label className="inline-editor-field">
          <span>负责人</span>
          <input type="text" value={formState.owner} onChange={(event) => updateField('owner', event.target.value)} />
        </label>

        <label className="inline-editor-field">
          <span>范围</span>
          <select value={formState.scope} onChange={(event) => updateField('scope', event.target.value as TestCase['scope'])}>
            <option value="app">手机 App</option>
            <option value="glasses">智能眼镜</option>
            <option value="linked">双端联动</option>
          </select>
        </label>

        <label className="inline-editor-field">
          <span>优先级</span>
          <select
            value={formState.priority}
            onChange={(event) => updateField('priority', event.target.value as TestCase['priority'])}
          >
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>
        </label>

        <label className="inline-editor-field">
          <span>状态</span>
          <select value={formState.status} onChange={(event) => updateField('status', event.target.value as TestCase['status'])}>
            <option value="草稿">草稿</option>
            <option value="待审核">待审核</option>
            <option value="已沉淀">已沉淀</option>
          </select>
        </label>

        <label className="inline-editor-field inline-editor-field-span-2">
          <span>标签</span>
          <input
            type="text"
            value={formState.tags.join(', ')}
            onChange={(event) => updateField('tags', parseTagsInput(event.target.value))}
          />
        </label>

        <label className="inline-editor-field inline-editor-field-span-2">
          <span>测试目标</span>
          <textarea rows={4} value={formState.objective} onChange={(event) => updateField('objective', event.target.value)} />
        </label>

        <label className="inline-editor-field inline-editor-field-span-2">
          <span>补充说明</span>
          <textarea rows={4} value={formState.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </label>
      </div>

      <div className="inline-structured-layout">
        <section className="inline-structured-panel inline-structured-panel-span-2">
          <div className="inline-structured-head">
            <div>
              <strong>执行步骤 · {structuredStats.steps}</strong>
              <p>逐行描述用户操作或系统触发动作。</p>
            </div>
          </div>
          <StructuredListEditor
            addLabel="新增一行"
            items={formState.steps}
            minRows={3}
            placeholder="请输入执行步骤"
            onAdd={() => addStructuredField('steps')}
            onChange={(itemId, value) => changeStructuredField('steps', itemId, value)}
            onRemove={(itemId) => removeStructuredField('steps', itemId)}
          />
        </section>

        <section className="inline-structured-panel inline-structured-panel-span-2">
          <div className="inline-structured-head">
            <div>
              <strong>预期结果 · {structuredStats.expected}</strong>
              <p>逐行描述每个步骤对应的理想结果。</p>
            </div>
          </div>
          <StructuredListEditor
            addLabel="新增一行"
            items={formState.expected}
            minRows={3}
            placeholder="请输入预期结果"
            onAdd={() => addStructuredField('expected')}
            onChange={(itemId, value) => changeStructuredField('expected', itemId, value)}
            onRemove={(itemId) => removeStructuredField('expected', itemId)}
          />
        </section>

        <section className="inline-structured-panel">
          <div className="inline-structured-head">
            <div>
              <strong>前置条件 · {structuredStats.preconditions}</strong>
              <p>补充环境准备、账号态和依赖开关。</p>
            </div>
          </div>
          <StructuredListEditor
            addLabel="新增一行"
            items={formState.preconditions}
            minRows={2}
            placeholder="请输入前置条件"
            onAdd={() => addStructuredField('preconditions')}
            onChange={(itemId, value) => changeStructuredField('preconditions', itemId, value)}
            onRemove={(itemId) => removeStructuredField('preconditions', itemId)}
          />
        </section>

        <section className="inline-structured-panel">
          <div className="inline-structured-head">
            <div>
              <strong>证据建议 · {structuredStats.evidence}</strong>
              <p>建议补充截图、录屏、日志或抓包信息。</p>
            </div>
          </div>
          <StructuredListEditor
            addLabel="新增一行"
            items={formState.evidence}
            minRows={3}
            placeholder="请输入证据建议"
            onAdd={() => addStructuredField('evidence')}
            onChange={(itemId, value) => changeStructuredField('evidence', itemId, value)}
            onRemove={(itemId) => removeStructuredField('evidence', itemId)}
          />
        </section>
      </div>
    </section>
  )
}
