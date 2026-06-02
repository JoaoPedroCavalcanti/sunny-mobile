import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { Dependent } from '@/types/domain';

export type DependentInput = {
  full_name: string;
  birth_date: string;
  cpf?: string;
  relationship?: string;
};

export type DependentPatch = Partial<DependentInput>;

export async function listDependents(householdId: number) {
  const { data } = await api.get<Dependent[] | { results?: Dependent[] }>(
    `/households/${householdId}/dependents/`
  );
  return normalizeListResponse(data);
}

export async function createDependent(householdId: number, payload: DependentInput) {
  const { data } = await api.post<Dependent>(
    `/households/${householdId}/dependents/`,
    payload
  );
  return data;
}

export async function patchDependent(
  householdId: number,
  dependentId: number,
  payload: DependentPatch
) {
  const { data } = await api.patch<Dependent>(
    `/households/${householdId}/dependents/${dependentId}/`,
    payload
  );
  return data;
}

export async function deleteDependent(householdId: number, dependentId: number) {
  await api.delete(`/households/${householdId}/dependents/${dependentId}/`);
}
