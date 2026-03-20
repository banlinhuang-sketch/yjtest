import { normalizeCurrentUserResponse, normalizeLoginResponse } from './backendAdapter.ts'
import { apiRequest, storeToken } from './client.ts'
import { buildLoginPayload, getApiRoute } from './requestAdapter.ts'

export async function login(username: string, password: string) {
  const payload = await apiRequest<unknown>(getApiRoute('authLogin'), {
    method: 'POST',
    body: buildLoginPayload(username, password),
    token: '',
  })
  const response = normalizeLoginResponse(payload)

  storeToken(response.accessToken)
  return response.user
}

export async function getCurrentUser() {
  const payload = await apiRequest<unknown>(getApiRoute('authMe'))
  return normalizeCurrentUserResponse(payload)
}
