import http from 'node:http'
import { URL } from 'node:url'

import {
  createCase,
  createExportTask,
  generateDraft,
  getCaseDetail,
  getExportTask,
  getExportTaskDownload,
  getStorageStatus,
  getUserByToken,
  listAuditLogs,
  listCases,
  listExportHistory,
  listKnowledgeSources,
  login,
  reviewCase,
  updateCase,
} from './store.mjs'

const PORT = Number.parseInt(process.env.API_PORT ?? '8787', 10)
const HOST = process.env.API_HOST ?? '127.0.0.1'

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

function sendEmpty(response, statusCode = 204) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  })
  response.end()
}

function sendDownload(response, payload) {
  response.writeHead(200, {
    'Content-Type': payload.contentType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`,
    'Access-Control-Allow-Origin': '*',
  })
  response.end(payload.content)
}

function sendError(response, statusCode, code, message, details = undefined) {
  sendJson(response, statusCode, {
    success: false,
    code,
    message,
    error: {
      code,
      message,
      status: statusCode,
      details,
    },
  })
}

function createApiError(statusCode, errorCode, message, details = undefined) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.errorCode = errorCode
  error.details = details
  return error
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
    })
    request.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(createApiError(422, 'INVALID_JSON', '请求体不是合法的 JSON。'))
      }
    })
    request.on('error', reject)
  })
}

function getBearerToken(request) {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice('Bearer '.length)
}

function requireUser(request, response) {
  const token = getBearerToken(request)
  if (!token) {
    sendError(response, 401, 'AUTH_UNAUTHORIZED', '登录已失效，请重新登录。')
    return null
  }

  const user = getUserByToken(token)
  if (!user) {
    sendError(response, 401, 'AUTH_UNAUTHORIZED', '登录已失效，请重新登录。')
    return null
  }

  return user
}

function requireRole(request, response, allowedRoleCodes) {
  const user = requireUser(request, response)
  if (!user) {
    return null
  }

  if (!allowedRoleCodes.includes(user.roleCode)) {
    sendError(response, 403, 'AUTH_FORBIDDEN', '当前账号没有权限执行该操作。')
    return null
  }

  return user
}

const server = http.createServer(async (request, response) => {
  if (!request.url || !request.method) {
    sendError(response, 404, 'ROUTE_NOT_FOUND', 'Not Found')
    return
  }

  if (request.method === 'OPTIONS') {
    sendEmpty(response)
    return
  }

  const url = new URL(request.url, `http://${request.headers.host ?? `${HOST}:${PORT}`}`)
  const pathname = url.pathname

  try {
    if (request.method === 'GET' && pathname === '/api/v1/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'yijing-test-platform-demo-api',
        now: new Date().toISOString(),
        host: HOST,
        port: PORT,
        storage: getStorageStatus(),
      })
      return
    }

    if (request.method === 'POST' && pathname === '/api/v1/auth/login') {
      const body = await parseRequestBody(request)
      const result = login(body.username, body.password)

      if (!result) {
        sendError(response, 401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误。')
        return
      }

      sendJson(response, 200, result)
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/auth/me') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      sendJson(response, 200, user)
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/cases') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      sendJson(response, 200, listCases(Object.fromEntries(url.searchParams.entries())))
      return
    }

    if (request.method === 'POST' && pathname === '/api/v1/cases') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const body = await parseRequestBody(request)
      sendJson(response, 201, createCase(body, user))
      return
    }

    if (request.method === 'POST' && pathname === '/api/v1/cases/generate-draft') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const body = await parseRequestBody(request)
      sendJson(response, 201, generateDraft(body, user))
      return
    }

    const caseDetailMatch = pathname.match(/^\/api\/v1\/cases\/([^/]+)$/)
    if (caseDetailMatch && request.method === 'GET') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const targetCase = getCaseDetail(decodeURIComponent(caseDetailMatch[1]))
      if (!targetCase) {
        sendError(response, 404, 'CASE_NOT_FOUND', '未找到对应的测试用例。')
        return
      }

      sendJson(response, 200, targetCase)
      return
    }

    if (caseDetailMatch && request.method === 'PATCH') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const body = await parseRequestBody(request)
      const updatedCase = updateCase(decodeURIComponent(caseDetailMatch[1]), body, user)

      if (!updatedCase) {
        sendError(response, 404, 'CASE_NOT_FOUND', '未找到对应的测试用例。')
        return
      }

      sendJson(response, 200, updatedCase)
      return
    }

    const reviewMatch = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/review$/)
    if (reviewMatch && request.method === 'POST') {
      const user = requireRole(request, response, ['reviewer', 'admin'])
      if (!user) {
        return
      }

      const body = await parseRequestBody(request)
      const updatedCase = reviewCase(decodeURIComponent(reviewMatch[1]), body, user)
      if (!updatedCase) {
        sendError(response, 404, 'CASE_NOT_FOUND', '未找到对应的测试用例。')
        return
      }

      sendJson(response, 200, updatedCase)
      return
    }

    if (request.method === 'POST' && pathname === '/api/v1/exports') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const body = await parseRequestBody(request)
      sendJson(response, 202, createExportTask(body, user))
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/exports/' ) {
      sendError(response, 404, 'ROUTE_NOT_FOUND', '未找到对应的接口。')
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/exports/history') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
      sendJson(response, 200, listExportHistory(user, limit))
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/audit-logs') {
      const user = requireRole(request, response, ['admin'])
      if (!user) {
        return
      }

      const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
      sendJson(response, 200, listAuditLogs(limit))
      return
    }

    if (request.method === 'GET' && pathname === '/api/v1/knowledge/sources') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      sendJson(response, 200, listKnowledgeSources())
      return
    }

    const exportMatch = pathname.match(/^\/api\/v1\/exports\/([^/]+)$/)
    if (exportMatch && request.method === 'GET') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const task = getExportTask(decodeURIComponent(exportMatch[1]))
      if (!task) {
        sendError(response, 404, 'EXPORT_TASK_NOT_FOUND', '未找到对应的导出任务。')
        return
      }

      sendJson(response, 200, task)
      return
    }

    const exportDownloadMatch = pathname.match(/^\/api\/v1\/exports\/([^/]+)\/download$/)
    if (exportDownloadMatch && request.method === 'GET') {
      const user = requireUser(request, response)
      if (!user) {
        return
      }

      const payload = getExportTaskDownload(decodeURIComponent(exportDownloadMatch[1]))
      if (!payload) {
        sendError(response, 409, 'EXPORT_FILE_NOT_READY', '导出文件尚未准备完成。')
        return
      }

      sendDownload(response, payload)
      return
    }

    sendError(response, 404, 'ROUTE_NOT_FOUND', '未找到对应接口。')
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const errorCode =
      typeof error === 'object' && error && 'errorCode' in error && typeof error.errorCode === 'string'
        ? error.errorCode
        : statusCode >= 500
          ? 'INTERNAL_ERROR'
          : statusCode === 422
            ? 'VALIDATION_FAILED'
            : statusCode === 403
              ? 'AUTH_FORBIDDEN'
              : statusCode === 401
                ? 'AUTH_UNAUTHORIZED'
                : statusCode === 404
                  ? 'ROUTE_NOT_FOUND'
                  : 'REQUEST_FAILED'
    const details =
      typeof error === 'object' && error && 'details' in error
        ? error.details
        : undefined

    sendError(
      response,
      statusCode,
      errorCode,
      error instanceof Error ? error.message : '服务端异常，请稍后再试。',
      details,
    )
  }
})

server.listen(PORT, HOST, () => {
  console.log(`亿境测试部演示版 API 已启动：http://${HOST}:${PORT}`)
})
