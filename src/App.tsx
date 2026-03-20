import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import './App.css'
import { listAuditLogs } from './api/audit.ts'
import { getCurrentUser, login } from './api/auth.ts'
import { createCase, generateDraftCase, listCases, reviewCase, saveCase } from './api/cases.ts'
import { listKnowledgeSources } from './api/knowledge.ts'
import { ApiError, clearStoredToken, getStoredToken, setUnauthorizedHandler } from './api/client.ts'
import type { ApiUser } from './api/contracts.ts'
import { Toast, type ToastVariant } from './components/Toast.tsx'
import { getSessionExpiredState, normalizeErrorToGlobalState, type StatePresetId } from './globalStates.ts'
import type { AuditLogEntry, KnowledgeResource, TestCase } from './types.ts'
import { formatNowLabel } from './utils.ts'
import { AuditLogView } from './views/AuditLogView.tsx'
import { CaseDetailEditorView } from './views/CaseDetailEditorView.tsx'
import { EmptyStateView } from './views/EmptyStateView.tsx'
import { ExportCenterView } from './views/ExportCenterView.tsx'
import { KnowledgeBaselineView } from './views/KnowledgeBaselineView.tsx'
import { LoginView } from './views/LoginView.tsx'
import { ReviewCenterView } from './views/ReviewCenterView.tsx'
import { WorkbenchView } from './views/WorkbenchView.tsx'

type WorkspaceView =
  | 'login'
  | 'workbench'
  | 'case-detail'
  | 'review-center'
  | 'export-center'
  | 'knowledge-baseline'
  | 'audit-logs'
  | 'empty-state'

type BusinessView = Exclude<WorkspaceView, 'login' | 'case-detail'>
type AuthState = 'booting' | 'authenticated' | 'unauthenticated'

interface GlobalToastState {
  variant: ToastVariant
  message: string
}

const VIEW_STORAGE_KEY = 'yijing.test-platform.view'
const CASE_STORAGE_KEY = 'yijing.test-platform.selected-case'

function isBusinessView(value: string | null): value is BusinessView {
  return (
    value === 'workbench' ||
    value === 'review-center' ||
    value === 'export-center' ||
    value === 'knowledge-baseline' ||
    value === 'audit-logs' ||
    value === 'empty-state'
  )
}

function readStoredView() {
  if (typeof window === 'undefined') {
    return 'workbench' as BusinessView
  }

  const storedView = window.sessionStorage.getItem(VIEW_STORAGE_KEY)
  return isBusinessView(storedView) ? storedView : 'workbench'
}

function readStoredCaseId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(CASE_STORAGE_KEY)
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function sortCasesByUpdatedAt(items: TestCase[]) {
  return [...items].sort((left, right) => right.updatedAtEpoch - left.updatedAtEpoch)
}

function upsertCaseInCollection(source: TestCase[], nextCase: TestCase) {
  const exists = source.some((item) => item.id === nextCase.id)
  const nextItems = exists
    ? source.map((item) => (item.id === nextCase.id ? nextCase : item))
    : [nextCase, ...source]

  return sortCasesByUpdatedAt(nextItems)
}

function touchInlineCase(nextCase: TestCase, detail: string) {
  const nextTimeLabel = formatNowLabel()

  return {
    ...nextCase,
    updatedAtLabel: nextTimeLabel,
    updatedAtEpoch: Date.now(),
    activity: [{ time: nextTimeLabel, detail, tone: 'primary' as const }, ...nextCase.activity].slice(0, 8),
  }
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => (getStoredToken() ? 'booting' : 'unauthenticated'))
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
  const [cases, setCases] = useState<TestCase[]>([])
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeResource[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [isCasesLoading, setIsCasesLoading] = useState(false)
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false)
  const [isAuditLogsLoading, setIsAuditLogsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [globalToast, setGlobalToast] = useState<GlobalToastState | null>(null)
  const [view, setView] = useState<WorkspaceView>(() => (getStoredToken() ? readStoredView() : 'login'))
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => readStoredCaseId())
  const [caseBackTarget, setCaseBackTarget] = useState<BusinessView>('workbench')
  const [globalPreset, setGlobalPreset] = useState<StatePresetId>('error')
  const [globalErrorTitle, setGlobalErrorTitle] = useState('服务暂时不可用，请稍后再试')
  const [globalErrorDescription, setGlobalErrorDescription] = useState('请稍后重试，或联系平台管理员排查后端接口状态。')
  const [globalRetryAction, setGlobalRetryAction] = useState<null | (() => void)>(null)

  const inlineSaveTimersRef = useRef<Record<string, number>>({})

  const selectedCase = useMemo(
    () => (selectedCaseId ? cases.find((item) => item.id === selectedCaseId) ?? null : null),
    [cases, selectedCaseId],
  )
  const canReview = currentUser?.roleCode === 'reviewer' || currentUser?.roleCode === 'admin'
  const canAccessAuditLogs = currentUser?.roleCode === 'admin'
  const activeView: WorkspaceView = view === 'case-detail' && !selectedCase ? caseBackTarget : view

  const showToast = useCallback((variant: ToastVariant, message: string) => {
    setGlobalToast({ variant, message })
  }, [])

  const openGlobalState = useCallback(
    (
      error: unknown,
      options?: {
        retry?: () => Promise<unknown>
        nextView?: BusinessView
      },
    ) => {
      const normalized = normalizeErrorToGlobalState(error)
      setGlobalPreset(normalized.preset)
      setGlobalErrorTitle(normalized.title)
      setGlobalErrorDescription(normalized.description)
      setGlobalRetryAction(() => () => {
        if (!options?.retry) {
          setView(options?.nextView ?? 'workbench')
          return
        }

        void options.retry()
          .then(() => {
            setView(options?.nextView ?? 'workbench')
          })
          .catch(() => undefined)
      })
      setView('empty-state')
      showToast('error', normalized.description)
    },
    [showToast],
  )

  const handleSessionExpired = useCallback(() => {
    const sessionState = getSessionExpiredState()
    setCurrentUser(null)
    setCases([])
    setKnowledgeSources([])
    setAuditLogs([])
    setAuthState('unauthenticated')
    setView('login')
    setSelectedCaseId(null)
    setGlobalPreset(sessionState.preset)
    setGlobalErrorTitle(sessionState.title)
    setGlobalErrorDescription(sessionState.description)
    setLoginError(sessionState.description)
    setGlobalRetryAction(() => () => setView('login'))
    showToast('error', sessionState.description)
  }, [showToast])

  const loadCasesFromApi = useCallback(async () => {
    setIsCasesLoading(true)

    try {
      const nextCases = await listCases()
      setCases(nextCases)
      setSelectedCaseId((current) => {
        if (current && nextCases.some((item) => item.id === current)) {
          return current
        }

        return nextCases[0]?.id ?? null
      })
      setGlobalRetryAction(null)
      return nextCases
    } catch (error) {
      if (!(isApiError(error) && error.status === 401)) {
        openGlobalState(error, {
          retry: loadCasesFromApi,
          nextView: 'workbench',
        })
      }
      throw error
    } finally {
      setIsCasesLoading(false)
    }
  }, [openGlobalState])

  const loadKnowledgeSourcesFromApi = useCallback(async () => {
    setIsKnowledgeLoading(true)

    try {
      const nextSources = await listKnowledgeSources()
      setKnowledgeSources(nextSources)
      setGlobalRetryAction(null)
      return nextSources
    } catch (error) {
      if (!(isApiError(error) && error.status === 401)) {
        openGlobalState(error, {
          retry: loadKnowledgeSourcesFromApi,
          nextView: 'knowledge-baseline',
        })
      }
      throw error
    } finally {
      setIsKnowledgeLoading(false)
    }
  }, [openGlobalState])

  const loadAuditLogsFromApi = useCallback(async () => {
    setIsAuditLogsLoading(true)

    try {
      const nextLogs = await listAuditLogs(200)
      setAuditLogs(nextLogs)
      setGlobalRetryAction(null)
      return nextLogs
    } catch (error) {
      if (!(isApiError(error) && error.status === 401)) {
        openGlobalState(error, {
          retry: loadAuditLogsFromApi,
          nextView: 'audit-logs',
        })
      }
      throw error
    } finally {
      setIsAuditLogsLoading(false)
    }
  }, [openGlobalState])

  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired)
    return () => setUnauthorizedHandler(null)
  }, [handleSessionExpired])

  useEffect(() => {
    if (!globalToast) {
      return undefined
    }

    const timer = window.setTimeout(() => setGlobalToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [globalToast])

  useEffect(() => {
    document.title = currentUser ? `亿境测试部 · ${currentUser.name}` : '亿境测试部'
  }, [currentUser])

  useEffect(() => {
    if (typeof window === 'undefined' || authState !== 'authenticated') {
      return
    }

    if (view !== 'login' && view !== 'case-detail') {
      window.sessionStorage.setItem(VIEW_STORAGE_KEY, view)
    }
  }, [authState, view])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (selectedCaseId) {
      window.sessionStorage.setItem(CASE_STORAGE_KEY, selectedCaseId)
      return
    }

    window.sessionStorage.removeItem(CASE_STORAGE_KEY)
  }, [selectedCaseId])

  useEffect(() => {
    if (!getStoredToken()) {
      return
    }

    let isCancelled = false
    const timersRef = inlineSaveTimersRef

    async function bootstrap() {
      try {
        const user = await getCurrentUser()
        if (isCancelled) {
          return
        }

        setCurrentUser(user)
        setAuthState('authenticated')

        try {
          await loadCasesFromApi()
          if (!isCancelled) {
            setView(readStoredView())
          }
        } catch {
          // loadCasesFromApi handles global empty state fallback.
        }
      } catch (error) {
        if (isCancelled) {
          return
        }

        if (isApiError(error) && error.status === 401) {
          handleSessionExpired()
          return
        }

        const normalized = normalizeErrorToGlobalState(error)
        setCurrentUser(null)
        setAuthState('unauthenticated')
        setLoginError(normalized.description)
      }
    }

    void bootstrap()

    return () => {
      isCancelled = true
      const activeTimers = timersRef.current
      Object.values(activeTimers).forEach((timer) => window.clearTimeout(timer))
    }
  }, [handleSessionExpired, loadCasesFromApi])

  useEffect(() => {
    if (authState !== 'authenticated' || view !== 'knowledge-baseline') {
      return
    }

    if (knowledgeSources.length > 0 || isKnowledgeLoading) {
      return
    }

    void loadKnowledgeSourcesFromApi().catch(() => undefined)
  }, [authState, isKnowledgeLoading, knowledgeSources.length, loadKnowledgeSourcesFromApi, view])

  useEffect(() => {
    if (authState !== 'authenticated' || view !== 'audit-logs' || !canAccessAuditLogs) {
      return
    }

    if (auditLogs.length > 0 || isAuditLogsLoading) {
      return
    }

    void loadAuditLogsFromApi().catch(() => undefined)
  }, [auditLogs.length, authState, canAccessAuditLogs, isAuditLogsLoading, loadAuditLogsFromApi, view])

  function navigate(nextView: BusinessView) {
    setView(nextView)
  }

  function openCaseDetail(caseId: string, backTarget: BusinessView = 'workbench') {
    setSelectedCaseId(caseId)
    setCaseBackTarget(backTarget)
    setView('case-detail')
  }

  function replaceCase(nextCase: TestCase) {
    setCases((current) => upsertCaseInCollection(current, nextCase))
    setSelectedCaseId(nextCase.id)
  }

  async function handleLogin(credentials: { username: string; password: string }) {
    setIsAuthenticating(true)
    setLoginError(null)

    try {
      const user = await login(credentials.username, credentials.password)
      setCurrentUser(user)
      setAuthState('authenticated')

      try {
        await loadCasesFromApi()
        setView(readStoredView())
      } catch {
        // loadCasesFromApi handles global empty state fallback.
      }

      showToast('success', `欢迎回来，${user.name}`)
    } catch (error) {
      clearStoredToken()
      setCurrentUser(null)
      setAuthState('unauthenticated')
      setLoginError(isApiError(error) ? error.message : '登录失败，请稍后重试。')
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function handleSaveCase(nextCase: TestCase) {
    const savedCase = await saveCase(nextCase)
    replaceCase(savedCase)
    return savedCase
  }

  async function handleGenerateDraft(input: {
    scope: TestCase['scope']
    title: string
    requirement: string
  }) {
    const nextCase = await generateDraftCase(input)
    replaceCase(nextCase)
    return nextCase
  }

  async function handleCreateCase(nextCase: TestCase) {
    const createdCase = await createCase(nextCase)
    replaceCase(createdCase)
    return createdCase
  }

  function handleInlineSaveCase(nextCase: TestCase, detail: string) {
    const optimisticCase = touchInlineCase(nextCase, detail)
    replaceCase(optimisticCase)

    const existingTimer = inlineSaveTimersRef.current[nextCase.id]
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    inlineSaveTimersRef.current[nextCase.id] = window.setTimeout(() => {
      void saveCase(optimisticCase)
        .then((savedCase) => {
          replaceCase(savedCase)
          delete inlineSaveTimersRef.current[nextCase.id]
        })
        .catch((error) => {
          delete inlineSaveTimersRef.current[nextCase.id]
          showToast('error', isApiError(error) ? error.message : '工作台自动保存失败，请稍后重试。')
        })
    }, 420)
  }

  async function handleReviewCase(
    caseId: string,
    input: { action: 'approve' | 'reject'; reviewNote: string },
  ) {
    const nextCase = await reviewCase(caseId, input)
    replaceCase(nextCase)
    return nextCase
  }

  if (authState === 'booting') {
    return (
      <div className="app-boot-shell">
        <div className="app-boot-panel">
          <span className="app-boot-spinner" aria-hidden="true" />
          <strong>正在恢复登录态并同步平台数据...</strong>
        </div>
      </div>
    )
  }

  if (authState !== 'authenticated' || activeView === 'login') {
    return <LoginView isSubmitting={isAuthenticating} errorMessage={loginError} onLogin={handleLogin} />
  }

  let content: ReactNode

  if (activeView === 'workbench') {
    content = (
      <WorkbenchView
        cases={cases}
        isLoading={isCasesLoading}
        onGenerateDraft={handleGenerateDraft}
        onCreateCase={handleCreateCase}
        onInlineSaveCase={handleInlineSaveCase}
        onOpenCase={(caseId) => openCaseDetail(caseId)}
        onOpenReview={() => navigate('review-center')}
        onOpenExport={() => navigate('export-center')}
        onOpenKnowledge={() => navigate('knowledge-baseline')}
        onOpenStates={() => navigate('empty-state')}
        onOpenAuditLogs={() => navigate('audit-logs')}
        canOpenAuditLogs={canAccessAuditLogs}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
      />
    )
  } else if (activeView === 'knowledge-baseline') {
    content = (
      <KnowledgeBaselineView
        sources={knowledgeSources}
        isLoading={isKnowledgeLoading}
        onSyncAll={loadKnowledgeSourcesFromApi}
        onOpenWorkbench={() => navigate('workbench')}
        onOpenReview={() => navigate('review-center')}
        onOpenExport={() => navigate('export-center')}
        onOpenStates={() => navigate('empty-state')}
        onOpenAuditLogs={() => navigate('audit-logs')}
        canOpenAuditLogs={canAccessAuditLogs}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
      />
    )
  } else if (activeView === 'export-center') {
    content = (
      <ExportCenterView
        cases={cases}
        onOpenWorkbench={() => navigate('workbench')}
        onOpenReview={() => navigate('review-center')}
        onOpenKnowledge={() => navigate('knowledge-baseline')}
        onOpenStates={() => navigate('empty-state')}
        onOpenAuditLogs={() => navigate('audit-logs')}
        canOpenAuditLogs={canAccessAuditLogs}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
      />
    )
  } else if (activeView === 'review-center') {
    content = (
      <ReviewCenterView
        cases={cases}
        isLoading={isCasesLoading}
        canReview={canReview}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
        onRefreshCases={loadCasesFromApi}
        onReviewCase={handleReviewCase}
        onOpenWorkbench={() => navigate('workbench')}
        onOpenCase={(caseId) => openCaseDetail(caseId, 'review-center')}
        onOpenExport={() => navigate('export-center')}
        onOpenKnowledge={() => navigate('knowledge-baseline')}
        onOpenStates={() => navigate('empty-state')}
        onOpenAuditLogs={() => navigate('audit-logs')}
        canOpenAuditLogs={canAccessAuditLogs}
      />
    )
  } else if (activeView === 'audit-logs') {
    content = (
      <AuditLogView
        logs={auditLogs}
        isLoading={isAuditLogsLoading}
        canAccess={canAccessAuditLogs}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
        onRefresh={loadAuditLogsFromApi}
        onOpenWorkbench={() => navigate('workbench')}
        onOpenReview={() => navigate('review-center')}
        onOpenExport={() => navigate('export-center')}
        onOpenKnowledge={() => navigate('knowledge-baseline')}
        onOpenStates={() => navigate('empty-state')}
      />
    )
  } else if (activeView === 'empty-state') {
    content = (
      <EmptyStateView
        initialPreset={globalPreset}
        headerTitle={globalErrorTitle}
        headerDescription={globalErrorDescription}
        onPrimaryAction={() => {
          if (globalRetryAction) {
            globalRetryAction()
            return
          }

          void loadCasesFromApi().then(() => setView('workbench')).catch(() => undefined)
        }}
        onOpenWorkbench={() => navigate('workbench')}
        onOpenReview={() => navigate('review-center')}
        onOpenExport={() => navigate('export-center')}
        onOpenKnowledge={() => navigate('knowledge-baseline')}
        onOpenAuditLogs={() => navigate('audit-logs')}
        canOpenAuditLogs={canAccessAuditLogs}
        currentUserName={currentUser?.name ?? '未命名用户'}
        currentUserRole={currentUser?.roleLabel ?? currentUser?.role ?? '测试成员'}
      />
    )
  } else {
    content = (
      <CaseDetailEditorView
        key={selectedCase?.id ?? 'case-detail-default'}
        initialCase={selectedCase}
        onBack={() => setView(caseBackTarget)}
        onSaveCase={handleSaveCase}
      />
    )
  }

  return (
    <>
      {content}
      {globalToast ? <Toast variant={globalToast.variant} message={globalToast.message} /> : null}
    </>
  )
}
