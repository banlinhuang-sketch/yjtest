import { normalizeCurrentUserResponse, normalizeLoginResponse } from './backendAdapter.ts'
import { apiRequest, storeToken } from './client.ts'

export async function login(username: string, password: string) {
  const payload = await apiRequest<unknown>('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
    token: '',
  })
  const response = normalizeLoginResponse(payload)

  storeToken(response.accessToken)
  return response.user
}

export async function getCurrentUser() {
  const payload = await apiRequest<unknown>('/api/v1/auth/me')
  return normalizeCurrentUserResponse(payload)
}
