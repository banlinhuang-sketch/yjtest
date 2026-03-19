import {
  normalizeCaseDetailResponse,
  normalizeCaseListResponse,
} from './backendAdapter.ts'
import { apiRequest } from './client.ts'
import { caseDetailDtoToTestCase, testCaseToCaseDetailPayload } from './caseAdapters.ts'
import type { TestCase } from '../types.ts'

export async function listCases() {
  const payload = await apiRequest<unknown>('/api/v1/cases', {
    query: { page: 1, pageSize: 200 },
  })
  const response = normalizeCaseListResponse(payload)

  const detailedCases = await Promise.all(
    response.items.map((item) =>
      apiRequest<unknown>(`/api/v1/cases/${encodeURIComponent(item.id)}`).then((detailPayload) =>
        normalizeCaseDetailResponse(detailPayload),
      ),
    ),
  )

  return detailedCases.map(caseDetailDtoToTestCase)
}

export async function saveCase(item: TestCase) {
  const payload = await apiRequest<unknown>(`/api/v1/cases/${encodeURIComponent(item.id)}`, {
    method: 'PATCH',
    body: testCaseToCaseDetailPayload(item),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function createCase(item: TestCase) {
  const payload = await apiRequest<unknown>('/api/v1/cases', {
    method: 'POST',
    body: testCaseToCaseDetailPayload(item),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function generateDraftCase(input: {
  scope: TestCase['scope']
  title: string
  requirement: string
}) {
  const payload = await apiRequest<unknown>('/api/v1/cases/generate-draft', {
    method: 'POST',
    body: input,
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function reviewCase(
  caseId: string,
  input: { action: 'approve' | 'reject'; reviewNote: string },
) {
  const payload = await apiRequest<unknown>(
    `/api/v1/cases/${encodeURIComponent(caseId)}/review`,
    {
      method: 'POST',
      body: input,
    },
  )
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}
