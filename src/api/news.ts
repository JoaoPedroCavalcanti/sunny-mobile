import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { News, Priority } from '@/types/domain';

export type NewsInput = {
  title: string;
  description: string;
  author: string;
  priority_level?: Priority;
};

export async function listNews() {
  const { data } = await api.get<News[] | { results?: News[] }>('/sunny_vale_news/');
  return normalizeListResponse(data);
}

export async function getNews(id: number) {
  const { data } = await api.get<News>(`/sunny_vale_news/${id}/`);
  return data;
}

export async function createNews(payload: NewsInput) {
  const { data } = await api.post<News>('/sunny_vale_news/', payload);
  return data;
}

export async function updateNews(id: number, payload: NewsInput) {
  const { data } = await api.put<News>(`/sunny_vale_news/${id}/`, payload);
  return data;
}

export async function patchNews(id: number, payload: Partial<NewsInput>) {
  const { data } = await api.patch<News>(`/sunny_vale_news/${id}/`, payload);
  return data;
}

export async function deleteNews(id: number) {
  await api.delete(`/sunny_vale_news/${id}/`);
}
