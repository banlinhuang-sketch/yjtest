import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Icon } from '../components/Icon.tsx'
import { StructuredListEditor, type StructuredListItem } from '../components/StructuredListEditor.tsx'
import { Toast, type ToastVariant } from '../components/Toast.tsx'
import type { TestCase } from '../types.ts'
import './CaseDetailEditorView.css'

type Scope = 'app' | 'glasses' | 'linked'
type ScopeValue = Scope | ''
type Priority = 'P0' | 'P1' | 'P2'
type Status = '草稿' | '待审核' | '已沉淀'
type StructuredFieldKey = 'preconditions' | 'steps' | 'expected' | 'evidence'
type PendingIntent = 'back' | 'reset' | null

interface CaseFormState {
  id: string
  title: string
  feature: string
  owner: string
  tags: string[]
  scope: ScopeValue
  priority: Priority
  status: Status
  objective: string
  notes: string
  preconditions: StructuredListItem[]
  steps: StructuredListItem[]
  expected: StructuredListItem[]
  evidence: StructuredListItem[]
}

interface FieldErrors {
  title: boolean
  scope: boolean
}

interface ToastState {
  variant: ToastVariant
  message: string
}

interface CaseDetailEditorViewProps {
  onBack: () => void
  initialCase?: TestCase | null
  onSaveCase?: (item: TestCase) => Promise<TestCase> | TestCase | void
}

const DEFAULT_LAST_SAVED_AT = '2026/03/17 14:20'

const featureOptions = ['用户体系 / 登录注册', '个人中心 / 账号信息', '支付模块 / 订单结算']
const ownerOptions = ['张三 (Zhang San)', '李四 (Li Si)', 'Banlin Huang']
const scopeOptions: Array<{ value: Scope; label: string; tone: 'blue' | 'teal' | 'orange'; icon: string }> = [
  { value: 'app', label: '手机 App', tone: 'blue', icon: 'smartphone' },
  { value: 'glasses', label: '智能眼镜', tone: 'teal', icon: 'eyeglasses' },
  { value: 'linked', label: '双端联动', tone: 'orange', icon: 'hub' },
]
const priorityOptions: Priority[] = ['P0', 'P1', 'P2']
const statusOptions: Status[] = ['草稿', '待审核', '已沉淀']

const statusToneMap: Record<Status, 'draft' | 'pending' | 'stable'> = {
  草稿: 'draft',
  待审核: 'pending',
  已沉淀: 'stable',
}

const emptyFieldErrors: FieldErrors = {
  title: false,
  scope: false,
}

function createStructuredId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createStructuredItem(prefix: string, content = ''): StructuredListItem {
  return {
    id: createStructuredId(prefix),
    content,
  }
}

const initialCaseFormState: CaseFormState = {
  id: 'CASE-2023-0892',
  title: '[TC-1024] 登录功能验证 - 异常流程处理',
  feature: featureOptions[0],
  owner: ownerOptions[0],
  tags: ['登录失败', '异常处理'],
  scope: 'app',
  priority: 'P1',
  status: '待审核',
  objective:
    '验证在网络异常、高频错误输入以及未注册手机号等边界场景下，登录模块的交互反馈、异常文案与兜底路径是否符合业务预期。',
  notes: '补充说明：本轮先聚焦账号体系与登录异常，不包含短信网关联调。',
  preconditions: [
    { id: 'precondition-1', content: '网络环境正常且稳定（4G / 5G / Wi-Fi）' },
    { id: 'precondition-2', content: '测试账号需处于“已登出”状态' },
  ],
  steps: [
    { id: 'step-1', content: '打开 APP 登录页，输入未注册的手机号' },
    { id: 'step-2', content: '在登录页连续输入错误密码 5 次' },
  ],
  expected: [
    { id: 'expected-1', content: '系统提示“该手机号未注册”，并展示注册入口' },
    { id: 'expected-2', content: '账号进入锁定状态，并提示“密码错误过多，请 5 分钟后重试”' },
  ],
  evidence: [
    { id: 'evidence-1', content: '登录页错误提示截图' },
    { id: 'evidence-2', content: '锁定态录屏片段' },
  ],
}

function buildCaseFormStateFromCase(item: TestCase): CaseFormState {
  return {
    id: item.id,
    title: item.title,
    feature: item.feature,
    owner: item.owner,
    tags: [...item.tags],
    scope: item.scope,
    priority: item.priority,
    status: item.status,
    objective: item.objective,
    notes: item.notes,
    preconditions: item.preconditions.map((entry, index) => ({
      id: `precondition-seed-${index + 1}`,
      content: entry,
    })),
    steps: item.steps.map((entry, index) => ({
      id: `step-seed-${index + 1}`,
      content: entry.action,
    })),
    expected: item.steps.map((entry, index) => ({
      id: `expected-seed-${index + 1}`,
      content: entry.expected,
    })),
    evidence: item.steps.map((entry, index) => ({
      id: `evidence-seed-${index + 1}`,
      content: entry.evidence,
    })),
  }
}

function buildTestCaseFromFormState(
  state: CaseFormState,
  source: TestCase | null,
  savedAtLabel: string,
): TestCase {
  const stepCount = Math.max(state.steps.length, state.expected.length, state.evidence.length)
  const nextSteps = Array.from({ length: stepCount }, (_, index) => ({
    action: state.steps[index]?.content ?? '',
    expected: state.expected[index]?.content ?? '',
    evidence: state.evidence[index]?.content ?? '',
  })).filter(
    (item) =>
      item.action.trim().length > 0 ||
      item.expected.trim().length > 0 ||
      item.evidence.trim().length > 0,
  )

  return {
    id: state.id,
    title: state.title.trim(),
    feature: state.feature,
    scope: (state.scope || source?.scope || 'app') as TestCase['scope'],
    priority: state.priority,
    status: state.status,
    owner: state.owner,
    submitter: source?.submitter ?? state.owner,
    objective: state.objective,
    notes: state.notes,
    tags: [...state.tags],
    preconditions: state.preconditions
      .map((item) => item.content.trim())
      .filter((item) => item.length > 0),
    steps: nextSteps,
    attachments: source?.attachments.map((item) => ({ ...item })) ?? [],
    activity: source?.activity.map((item) => ({ ...item })) ?? [],
    reviewNote: source?.reviewNote ?? '',
    updatedAtLabel: savedAtLabel,
    updatedAtEpoch: Date.now(),
  }
}

function serializeCaseFormState(state: CaseFormState) {
  return JSON.stringify(state)
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function parseTagsInput(value: string) {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getScopeMeta(scope: ScopeValue) {
  return scopeOptions.find((option) => option.value === scope) ?? null
}

function getOwnerInitials(owner: string) {
  if (owner === '张三 (Zhang San)') {
    return 'ZH'
  }

  if (owner === '李四 (Li Si)') {
    return 'LS'
  }

  return 'BH'
}

function EditorSection({
  icon,
  title,
  children,
  actions,
}: {
  icon: string
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="editor-section-card">
      <div className="editor-section-head">
        <h3>
          <Icon name={icon} />
          {title}
        </h3>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

function EditorField({
  label,
  required = false,
  error = false,
  message,
  children,
}: {
  label: string
  required?: boolean
  error?: boolean
  message?: string
  children: ReactNode
}) {
  return (
    <label className={`editor-field ${error ? 'has-error' : ''}`.trim()}>
      <span className="editor-field-label">
        {label}
        {required ? <em>*</em> : null}
      </span>
      {children}
      {message ? <span className="editor-error-text">{message}</span> : null}
    </label>
  )
}

function ToolbarSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  leading,
}: {
  label: string
  value: T
  options: T[]
  onChange: (nextValue: T) => void
  leading?: ReactNode
}) {
  return (
    <label className="editor-toolbar-select">
      {leading}
      <select value={value} onChange={(event) => onChange(event.target.value as T)} aria-label={label}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Icon name="expand_more" className="editor-select-arrow" />
    </label>
  )
}

export function CaseDetailEditorView({
  onBack,
  initialCase = null,
  onSaveCase,
}: CaseDetailEditorViewProps) {
  const [bootState] = useState(() => ({
    form: initialCase ? buildCaseFormStateFromCase(initialCase) : initialCaseFormState,
    lastSavedAt: initialCase?.updatedAtLabel || DEFAULT_LAST_SAVED_AT,
  }))
  const [caseFormState, setCaseFormState] = useState<CaseFormState>(bootState.form)
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeCaseFormState(bootState.form))
  const [lastSavedAt, setLastSavedAt] = useState(bootState.lastSavedAt)
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors)
  const [toastState, setToastState] = useState<ToastState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'error'>('idle')

  const toastTimerRef = useRef<number | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const isDirty = serializeCaseFormState(caseFormState) !== savedSnapshot
  const scopeMeta = getScopeMeta(caseFormState.scope)
  const structuredStats = useMemo(
    () => ({
      preconditions: caseFormState.preconditions.length,
      steps: caseFormState.steps.length,
      expected: caseFormState.expected.length,
      evidence: caseFormState.evidence.length,
    }),
    [
      caseFormState.preconditions.length,
      caseFormState.steps.length,
      caseFormState.expected.length,
      caseFormState.evidence.length,
    ],
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!toastState) {
      return undefined
    }

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastState(null)
      toastTimerRef.current = null
    }, 2200)

    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [toastState])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function updateField<K extends keyof CaseFormState>(field: K, value: CaseFormState[K]) {
    setCaseFormState((current) => ({
      ...current,
      [field]: value,
    }))
    setSaveStatus('idle')

    if (field === 'title') {
      setFieldErrors((current) => ({ ...current, title: false }))
    }

    if (field === 'scope') {
      setFieldErrors((current) => ({ ...current, scope: false }))
    }
  }

  function updateStructuredField(
    field: StructuredFieldKey,
    updater: (items: StructuredListItem[]) => StructuredListItem[],
  ) {
    setCaseFormState((current) => {
      const nextItems = updater(current[field])

      return {
        ...current,
        [field]: nextItems.length > 0 ? nextItems : [createStructuredItem(field)],
      }
    })
    setSaveStatus('idle')
  }

  function handleStructuredAdd(field: StructuredFieldKey) {
    updateStructuredField(field, (items) => [...items, createStructuredItem(field)])
  }

  function handleStructuredRemove(field: StructuredFieldKey, itemId: string) {
    updateStructuredField(field, (items) =>
      items.length === 1 ? items : items.filter((item) => item.id !== itemId),
    )
  }

  function handleStructuredChange(field: StructuredFieldKey, itemId: string, value: string) {
    updateStructuredField(field, (items) =>
      items.map((item) => (item.id === itemId ? { ...item, content: value } : item)),
    )
  }

  function showToast(variant: ToastVariant, message: string) {
    setToastState({ variant, message })
  }

  function validateBeforeSave() {
    const nextErrors: FieldErrors = {
      title: caseFormState.title.trim().length === 0,
      scope: caseFormState.scope === '',
    }

    setFieldErrors(nextErrors)

    if (nextErrors.title || nextErrors.scope) {
      showToast('error', '标题和范围为必填项，请补充后再保存。')
      return false
    }

    return true
  }

  function handleSave() {
    if (isSaving) {
      return
    }

    if (!validateBeforeSave()) {
      return
    }

    setIsSaving(true)

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      const nextSavedAt = formatDateTime(new Date())
      const draftCase = buildTestCaseFromFormState(caseFormState, initialCase, nextSavedAt)

      void Promise.resolve(onSaveCase?.(draftCase))
        .then((savedCase) => {
          const normalizedSavedAt =
            savedCase && typeof savedCase === 'object' && 'updatedAtLabel' in savedCase
              ? savedCase.updatedAtLabel
              : nextSavedAt
          const nextFormState =
            savedCase && typeof savedCase === 'object' && 'id' in savedCase
              ? buildCaseFormStateFromCase(savedCase as TestCase)
              : caseFormState
          const nextSnapshot = serializeCaseFormState(nextFormState)

          setCaseFormState(nextFormState)
          setSavedSnapshot(nextSnapshot)
          setLastSavedAt(normalizedSavedAt)
          setSaveStatus('idle')
          setIsSaving(false)
          showToast('success', '保存成功')
          saveTimerRef.current = null
        })
        .catch((error) => {
          setIsSaving(false)
          setSaveStatus('error')
          showToast('error', error instanceof Error ? error.message : '保存失败，请稍后重试')
          saveTimerRef.current = null
        })
    }, 1000)
  }

  function handleImmediateReset() {
    setCaseFormState(JSON.parse(savedSnapshot) as CaseFormState)
    setFieldErrors(emptyFieldErrors)
    setSaveStatus('idle')
  }

  function requestIntent(intent: Exclude<PendingIntent, null>) {
    if (!isDirty) {
      if (intent === 'back') {
        onBack()
        return
      }

      handleImmediateReset()
      return
    }

    setPendingIntent(intent)
  }

  function confirmIntent() {
    if (pendingIntent === 'back') {
      setPendingIntent(null)
      onBack()
      return
    }

    if (pendingIntent === 'reset') {
      handleImmediateReset()
      setPendingIntent(null)
    }
  }

  return (
    <div className="editor-page-shell">
      <header className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button className="editor-back-button" type="button" onClick={() => requestIntent('back')}>
            <Icon name="arrow_back" />
            <span>返回工作台</span>
          </button>

          <span className="editor-toolbar-divider" />

          <div className="editor-toolbar-title-group">
            <div className="editor-toolbar-title-row">
              <h1 className={isDirty ? 'is-dirty' : ''}>{caseFormState.title || '未命名用例'}</h1>
              <span className="editor-case-id">{caseFormState.id}</span>
              {scopeMeta ? (
                <span className={`editor-scope-badge ${scopeMeta.tone}`}>
                  <Icon name={scopeMeta.icon} />
                  <span>{scopeMeta.label}</span>
                </span>
              ) : (
                <span className="editor-scope-badge error">
                  <Icon name="error" />
                  <span>未选择范围</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="editor-toolbar-right">
          <span className={`editor-save-hint ${isDirty ? 'dirty' : ''} ${saveStatus === 'error' ? 'error' : ''}`.trim()}>
            {saveStatus === 'error' ? '保存失败，请重试' : isDirty ? '有未保存修改' : `已保存 · ${lastSavedAt}`}
          </span>
          <ToolbarSelect
            label="状态"
            value={caseFormState.status}
            options={statusOptions}
            onChange={(nextValue) => updateField('status', nextValue)}
            leading={<span className={`editor-status-dot ${statusToneMap[caseFormState.status]}`} />}
          />
          <ToolbarSelect
            label="优先级"
            value={caseFormState.priority}
            options={priorityOptions}
            onChange={(nextValue) => updateField('priority', nextValue)}
            leading={<span className="editor-priority-mark">{caseFormState.priority}</span>}
          />

          <button className="editor-secondary-button" type="button" onClick={() => requestIntent('reset')}>
            取消
          </button>
          <button className="editor-primary-button" disabled={isSaving} type="button" onClick={handleSave}>
            {isSaving ? <span className="editor-button-spinner" aria-hidden="true" /> : <Icon name="save" />}
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </header>

      <main className="editor-main">
        <div className="editor-layout">
          <div className="editor-main-column">
            <EditorSection icon="info" title="基础信息">
              <div className="editor-form-grid">
                <div className="editor-grid-span-2">
                  <EditorField
                    label="用例标题"
                    required
                    error={fieldErrors.title}
                    message={fieldErrors.title ? '标题不能为空' : undefined}
                  >
                    <input
                      className={fieldErrors.title ? 'editor-input-error' : ''}
                      type="text"
                      value={caseFormState.title}
                      onChange={(event) => updateField('title', event.target.value)}
                    />
                  </EditorField>
                </div>

                <EditorField label="所属模块">
                  <select value={caseFormState.feature} onChange={(event) => updateField('feature', event.target.value)}>
                    {featureOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </EditorField>

                <EditorField label="负责人">
                  <label className="editor-owner-select">
                    <span className="editor-owner-avatar">{getOwnerInitials(caseFormState.owner)}</span>
                    <select value={caseFormState.owner} onChange={(event) => updateField('owner', event.target.value)}>
                      {ownerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <Icon name="expand_more" className="editor-select-arrow" />
                  </label>
                </EditorField>

                <EditorField
                  label="范围"
                  required
                  error={fieldErrors.scope}
                  message={fieldErrors.scope ? '请选择一个范围' : undefined}
                >
                  <div className={`editor-scope-switcher ${fieldErrors.scope ? 'has-error' : ''}`.trim()}>
                    {scopeOptions.map((option) => (
                      <button
                        key={option.value}
                        className={`editor-scope-choice ${option.tone} ${
                          caseFormState.scope === option.value ? 'active' : ''
                        }`.trim()}
                        type="button"
                        onClick={() => updateField('scope', option.value)}
                      >
                        <Icon name={option.icon} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </EditorField>

                <EditorField label="标签">
                  <input
                    type="text"
                    value={caseFormState.tags.join(', ')}
                    onChange={(event) => updateField('tags', parseTagsInput(event.target.value))}
                    placeholder="输入标签后用逗号分隔"
                  />
                </EditorField>
              </div>
            </EditorSection>

            <EditorSection icon="account_tree" title="执行步骤与预期结果">
              <div className="editor-structured-grid">
                <section className="editor-structured-panel">
                  <div className="editor-structured-panel-head">
                    <strong>执行步骤</strong>
                    <p>逐行描述用户操作或系统触发动作。</p>
                  </div>
                  <StructuredListEditor
                    addLabel="新增一行"
                    items={caseFormState.steps}
                    minRows={3}
                    placeholder="请输入执行步骤"
                    onAdd={() => handleStructuredAdd('steps')}
                    onChange={(itemId, value) => handleStructuredChange('steps', itemId, value)}
                    onRemove={(itemId) => handleStructuredRemove('steps', itemId)}
                  />
                </section>

                <section className="editor-structured-panel">
                  <div className="editor-structured-panel-head">
                    <strong>预期结果</strong>
                    <p>逐行描述每个步骤对应的理想结果。</p>
                  </div>
                  <StructuredListEditor
                    addLabel="新增一行"
                    items={caseFormState.expected}
                    minRows={3}
                    placeholder="请输入预期结果"
                    onAdd={() => handleStructuredAdd('expected')}
                    onChange={(itemId, value) => handleStructuredChange('expected', itemId, value)}
                    onRemove={(itemId) => handleStructuredRemove('expected', itemId)}
                  />
                </section>
              </div>
            </EditorSection>
          </div>

          <aside className="editor-side-column">
            <EditorSection icon="rule" title={`前置条件 · ${structuredStats.preconditions}`}>
              <StructuredListEditor
                addLabel="新增一行"
                items={caseFormState.preconditions}
                minRows={2}
                placeholder="请输入前置条件"
                onAdd={() => handleStructuredAdd('preconditions')}
                onChange={(itemId, value) => handleStructuredChange('preconditions', itemId, value)}
                onRemove={(itemId) => handleStructuredRemove('preconditions', itemId)}
              />
            </EditorSection>

            <EditorSection icon="ads_click" title="测试目标">
              <EditorField label="测试目标">
                <textarea
                  rows={5}
                  value={caseFormState.objective}
                  onChange={(event) => updateField('objective', event.target.value)}
                />
              </EditorField>
            </EditorSection>

            <EditorSection icon="inventory_2" title={`证据建议 · ${structuredStats.evidence}`}>
              <StructuredListEditor
                addLabel="新增一行"
                items={caseFormState.evidence}
                minRows={3}
                placeholder="请输入截图、录屏、日志或抓包建议"
                onAdd={() => handleStructuredAdd('evidence')}
                onChange={(itemId, value) => handleStructuredChange('evidence', itemId, value)}
                onRemove={(itemId) => handleStructuredRemove('evidence', itemId)}
              />
            </EditorSection>

            <EditorSection icon="history_edu" title="备注说明">
              <EditorField label="补充说明">
                <textarea
                  rows={4}
                  value={caseFormState.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                />
              </EditorField>

              <div className="editor-meta-block">
                <div>
                  <span>创建人</span>
                  <strong>系统管理员</strong>
                </div>
                <div>
                  <span>最后修改</span>
                  <strong>{lastSavedAt}</strong>
                </div>
                <div>
                  <span>步骤数</span>
                  <strong>{structuredStats.steps} 条</strong>
                </div>
                <div>
                  <span>预期数</span>
                  <strong>{structuredStats.expected} 条</strong>
                </div>
              </div>
            </EditorSection>
          </aside>
        </div>
      </main>

      {toastState ? <Toast variant={toastState.variant} message={toastState.message} /> : null}

      {pendingIntent ? (
        <ConfirmDialog
          title={pendingIntent === 'back' ? '当前用例有未保存的修改，确认离开吗？' : '当前用例有未保存的修改，确认放弃吗？'}
          description="当前编辑内容尚未保存，继续操作将丢失本次修改。"
          confirmText={pendingIntent === 'back' ? '确认离开' : '放弃修改'}
          onCancel={() => setPendingIntent(null)}
          onConfirm={confirmIntent}
        />
      ) : null}
    </div>
  )
}
