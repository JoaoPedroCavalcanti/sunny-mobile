import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { News } from '@/types/domain';

export async function listNews() {
  const { data } = await api.get<News[] | { results?: News[] }>('/sunny_vale_news/');
  return normalizeListResponse(data);
}

export async function createNews(payload: Omit<News, 'id' | 'created_at' | 'updated_at'>) {
  const { data } = await api.post<News>('/sunny_vale_news/', payload);
  return data;
}

export async function patchNews(id: number, payload: Partial<News>) {
  const { data } = await api.patch<News>(`/sunny_vale_news/${id}/`, payload);
  return data;
}

export async function deleteNews(id: number) {
  await api.delete(`/sunny_vale_news/${id}/`);
}
