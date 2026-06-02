import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { User, UserRole } from '@/types/domain';

export type HouseholdRequest =
  | { apartment: string; block?: string }
  | { household_id: number };

export type UserCreateInput = {
  username: string;
  password: string;
  full_name: string;
  birth_date: string;
  cpf: string;
  phone: string;
  email: string;
  household_request?: HouseholdRequest;
  role?: UserRole;
  photo?: string;
};

export type EmployeeCreateInput = {
  username: string;
  password: string;
  full_name: string;
  email: string;
  birth_date?: string;
  cpf?: string;
  phone?: string;
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

// Patch via admin: aceita role, alem de tudo do UserPatchInput.
export type AdminUserPatchInput = UserPatchInput & { role?: UserRole };

export async function getMe() {
  const { data } = await api.get<User>('/user/me/');
  return data;
}

// NAO envie role aqui — /user/me/ rejeita esse campo com 403.
export async function patchMe(payload: UserPatchInput) {
  const { data } = await api.patch<User>('/user/me/', payload);
  return data;
}

export type ListUsersParams = {
  role?: UserRole;
};

export async function listUsers(params?: ListUsersParams) {
  const { data } = await api.get<User[] | { results?: User[] }>('/user/', { params });
  return normalizeListResponse(data);
}

export async function listEmployees() {
  return listUsers({ role: 'EMPLOYEE' });
}

export async function getUser(id: number) {
  const { data } = await api.get<User>(`/user/${id}/`);
  return data;
}

export async function createUser(payload: UserCreateInput) {
  const { data } = await api.post<User>('/user/', payload);
  return data;
}

export async function createEmployee(payload: EmployeeCreateInput) {
  const { data } = await api.post<User>('/user/', { ...payload, role: 'EMPLOYEE' });
  return data;
}

export async function patchUser(id: number, payload: AdminUserPatchInput) {
  const { data } = await api.patch<User>(`/user/${id}/`, payload);
  return data;
}

export async function setUserRole(id: number, role: UserRole) {
  const { data } = await api.patch<User>(`/user/${id}/`, { role });
  return data;
}

export async function deleteUser(id: number) {
  await api.delete(`/user/${id}/`);
}
