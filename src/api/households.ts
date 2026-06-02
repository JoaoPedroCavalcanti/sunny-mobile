import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { Household } from '@/types/domain';

export type HouseholdSearchParams = {
  apartment: string;
  block?: string;
};

export async function searchHouseholds(params: HouseholdSearchParams) {
  const { apartment, block } = params;
  const query: Record<string, string> = { apartment: apartment.trim() };
  if (block && block.trim()) {
    query.block = block.trim();
  }

  const { data } = await api.get<Household[] | { results?: Household[] }>(
    '/households/search/',
    { params: query }
  );
  return normalizeListResponse(data);
}

export async function listHouseholds() {
  const { data } = await api.get<Household[] | { results?: Household[] }>(
    '/households/'
  );
  return normalizeListResponse(data);
}
