import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { User } from '@/types/domain';

export async function getMe() {
  const { data } = await api.get<User>('/user/me/');
  return data;
}

export async function patchMe(payload: Partial<User>) {
  const { data } = await api.patch<User>('/user/me/', payload);
  return data;
}

export async function listUsers() {
  const { data } = await api.get<User[] | { results?: User[] }>('/user/');
  return normalizeListResponse(data);
}

export async function createUser(payload: Omit<User, 'id'>) {
  const { data } = await api.post<User>('/user/', payload);
  return data;
}

export async function deleteUser(userId: number) {
  await api.delete(`/user/${userId}/`);
}
