import { extractApiMessage, unwrapApiPayload } from './backendAdapter.ts'

const TOKEN_STORAGE_KEY = 'yijing.test-platform.token'
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ?? ''
const API_TIMEOUT_MS = Number.parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? '12000', 10)

type LooseRecord = Record<string, unknown>

function asRecord(value: unknown): LooseRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as LooseRecord) : null
}

function readCode(record: LooseRecord | null) {
  if (!record) {
    return ''
  }

  const direct = record.code ?? record.errorCode
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim()
  }

  const nested = asRecord(record.error)
  const nestedCode = nested?.code ?? nested?.errorCode
  if (typeof nestedCode === 'string' && nestedCode.trim()) {
    return nestedCode.trim()
  }

  return ''
}

function readDetails(record: LooseRecord | null): unknown {
  if (!record) {
    return undefined
  }

  if ('details' in record) {
    return record.details
  }

  const nested = asRecord(record.error)
  if (nested && 'details' in nested) {
    return nested.details
  }

  return undefined
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(message: string, status: number, code = 'UNKNOWN_ERROR', details: unknown = undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export function getStoredToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
}

export function storeToken(token: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function resolveApiUrl(pathOrUrl: string) {
  if (!pathOrUrl) {
    return ''
  }

  try {
    return new URL(pathOrUrl).toString()
  } catch {
    const base = API_BASE_URL || window.location.origin
    return new URL(pathOrUrl, base.endsWith('/') ? base : `${base}/`).toString()
  }
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(resolveApiUrl(path))

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        return
      }

      url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH'
    body?: unknown
    query?: Record<string, string | number | undefined>
    token?: string
    signal?: AbortSignal
  } = {},
) {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : 12000,
  )
  const token = options.token ?? getStoredToken()

  try {
    const response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? controller.signal,
    })

    const rawText = await response.text()
    let payload: unknown = null

    if (rawText) {
      try {
        payload = JSON.parse(rawText) as unknown
      } catch {
        payload = { message: rawText }
      }
    }

    const normalizedPayload = unwrapApiPayload(payload)
    const payloadRecord = asRecord(payload) ?? asRecord(normalizedPayload)
    const errorCode = readCode(payloadRecord) || (response.ok ? 'OK' : 'REQUEST_FAILED')
    const errorDetails = readDetails(payloadRecord)

    if (response.status === 401) {
      clearStoredToken()
      unauthorizedHandler?.()
      throw new ApiError(
        extractApiMessage(payload, '登录已失效，请重新登录。'),
        401,
        errorCode || 'AUTH_UNAUTHORIZED',
        errorDetails,
      )
    }

    if (!response.ok) {
      throw new ApiError(
        extractApiMessage(payload, '请求失败，请稍后重试。'),
        response.status,
        errorCode,
        errorDetails,
      )
    }

    return normalizedPayload as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络后重试。', 0, 'NETWORK_TIMEOUT')
    }

    throw new ApiError('网络连接异常，请稍后重试。', 0, 'NETWORK_ERROR')
  } finally {
    window.clearTimeout(timeout)
  }
}
