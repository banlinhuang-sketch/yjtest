import { normalizeKnowledgeSourceListResponse } from './backendAdapter.ts'
import { apiRequest } from './client.ts'
import type { KnowledgeSourceDTO } from './contracts.ts'
import type { KnowledgeResource } from '../types.ts'

function knowledgeSourceDtoToResource(item: KnowledgeSourceDTO): KnowledgeResource {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    categoryLabel: item.categoryLabel,
    summary: item.summary,
    updatedAt: item.updatedAt,
    icon: item.icon,
    accent: item.accent,
  }
}

export async function listKnowledgeSources() {
  const payload = await apiRequest<unknown>('/api/v1/knowledge/sources')
  const response = normalizeKnowledgeSourceListResponse(payload)
  return response.items.map(knowledgeSourceDtoToResource)
}
