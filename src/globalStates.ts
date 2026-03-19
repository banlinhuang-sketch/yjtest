import { ApiError } from './api/client.ts'

export type StatePresetId =
  | 'session-expired'
  | 'no-data'
  | 'filtered-empty'
  | 'no-permission'
  | 'error'
  | 'network'

export interface GlobalStateDescriptor {
  preset: StatePresetId
  title: string
  description: string
  actionText: string
}

export function getSessionExpiredState(): GlobalStateDescriptor {
  return {
    preset: 'session-expired',
    title: '登录已失效，请重新登录后继续操作',
    description: '当前会话已过期或令牌失效，重新登录后会恢复平台访问权限。',
    actionText: '重新登录',
  }
}

function buildValidationState(message: string): GlobalStateDescriptor {
  return {
    preset: 'error',
    title: '提交内容未通过校验，请检查后重试',
    description: message || '后端接口已拒绝当前提交，请根据提示补充或修正字段。',
    actionText: '返回并修正',
  }
}

export function normalizeErrorToGlobalState(error: unknown): GlobalStateDescriptor {
  if (error instanceof ApiError) {
    if (error.code === 'AUTH_UNAUTHORIZED' || error.status === 401) {
      return getSessionExpiredState()
    }

    if (error.code === 'AUTH_FORBIDDEN' || error.status === 403) {
      return {
        preset: 'no-permission',
        title: '当前账号暂无权限访问该数据',
        description: '请联系平台管理员确认角色权限，或切换到已授权账号后重试。',
        actionText: '返回工作台',
      }
    }

    if (
      error.code === 'INVALID_JSON' ||
      error.code === 'VALIDATION_FAILED' ||
      error.code === 'CASE_REVIEW_NOTE_REQUIRED' ||
      error.status === 422
    ) {
      return buildValidationState(
        error.message || '提交内容未通过后端校验，请按提示修正后重试。',
      )
    }

    if (
      error.code === 'CASE_NOT_FOUND' ||
      error.code === 'EXPORT_TASK_NOT_FOUND' ||
      error.code === 'ROUTE_NOT_FOUND' ||
      error.status === 404
    ) {
      return {
        preset: 'no-data',
        title: '当前没有可展示的数据',
        description: error.message || '目标资源不存在，或当前筛选条件下暂无可用内容。',
        actionText: '重新加载',
      }
    }

    if (error.code === 'EXPORT_FILE_NOT_READY' || error.status === 409) {
      return {
        preset: 'error',
        title: '导出文件仍在处理中，请稍后重试',
        description: error.message || '导出任务尚未完成打包，请等待几秒后重新获取。',
        actionText: '稍后重试',
      }
    }

    if (
      error.code === 'NETWORK_TIMEOUT' ||
      error.code === 'NETWORK_ERROR' ||
      error.status === 0
    ) {
      return {
        preset: 'network',
        title: '网络连接不稳定，请检查后重试',
        description: error.message || '当前无法连通接口服务，请检查网络或稍后重试。',
        actionText: '重新连接',
      }
    }
  }

  return {
    preset: 'error',
    title: '服务暂时不可用，请稍后再试',
    description: error instanceof Error ? error.message : '系统异常，请稍后重试。',
    actionText: '重新加载',
  }
}
