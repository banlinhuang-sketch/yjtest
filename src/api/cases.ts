import {
  normalizeCaseDetailResponse,
  normalizeCaseListResponse,
} from './backendAdapter.ts'
import { apiRequest } from './client.ts'
import { caseDetailDtoToTestCase } from './caseAdapters.ts'
import {
  buildCaseListQuery,
  buildCasePayload,
  buildGenerateDraftPayload,
  buildReviewPayload,
  getApiRoute,
} from './requestAdapter.ts'
import type { TestCase } from '../types.ts'

export async function listCases() {
  const payload = await apiRequest<unknown>(getApiRoute('casesList'), {
    query: buildCaseListQuery(1, 200),
  })
  const response = normalizeCaseListResponse(payload)

  const detailedCases = await Promise.all(
    response.items.map((item) =>
      apiRequest<unknown>(getApiRoute('caseDetail', { id: item.id })).then((detailPayload) =>
        normalizeCaseDetailResponse(detailPayload),
      ),
    ),
  )

  return detailedCases.map(caseDetailDtoToTestCase)
}

export async function saveCase(item: TestCase) {
  const payload = await apiRequest<unknown>(getApiRoute('caseDetail', { id: item.id }), {
    method: 'PATCH',
    body: buildCasePayload(item),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function createCase(item: TestCase) {
  const payload = await apiRequest<unknown>(getApiRoute('casesList'), {
    method: 'POST',
    body: buildCasePayload(item),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function generateDraftCase(input: {
  scope: TestCase['scope']
  title: string
  requirement: string
}) {
  const payload = await apiRequest<unknown>(getApiRoute('generateDraft'), {
    method: 'POST',
    body: buildGenerateDraftPayload(input),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}

export async function reviewCase(
  caseId: string,
  input: { action: 'approve' | 'reject'; reviewNote: string },
) {
  const payload = await apiRequest<unknown>(getApiRoute('reviewCase', { id: caseId }), {
    method: 'POST',
    body: buildReviewPayload(input),
  })
  const response = normalizeCaseDetailResponse(payload)

  return caseDetailDtoToTestCase(response)
}
