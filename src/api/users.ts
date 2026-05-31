import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { User } from '@/types/domain';

export type UserCreateInput = {
  username: string;
  password: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  phone: string;
  email: string;
  apartment: string;
  block?: string;
  photo?: string;
};

export type UserPatchInput = Partial<{
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  phone: string;
  apartment: string;
  block: string;
  photo: string;
}>;

export async function getMe() {
  const { data } = await api.get<User>('/user/me/');
  return data;
}

export async function patchMe(payload: UserPatchInput) {
  const { data } = await api.patch<User>('/user/me/', payload);
  return data;
}

export async function listUsers() {
  const { data } = await api.get<User[] | { results?: User[] }>('/user/');
  return normalizeListResponse(data);
}

export async function getUser(id: number) {
  const { data } = await api.get<User>(`/user/${id}/`);
  return data;
}

export async function createUser(payload: UserCreateInput) {
  const { data } = await api.post<User>('/user/', payload);
  return data;
}

export async function patchUser(id: number, payload: UserPatchInput) {
  const { data } = await api.patch<User>(`/user/${id}/`, payload);
  return data;
}

export async function deleteUser(id: number) {
  await api.delete(`/user/${id}/`);
}
