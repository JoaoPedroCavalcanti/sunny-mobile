import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type {
  Household,
  MembershipDecision,
  PendingApproval
} from '@/types/domain';

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

export async function listPendingApprovals() {
  const { data } = await api.get<
    PendingApproval[] | { results?: PendingApproval[] }
  >('/households/pending-approvals/');
  return normalizeListResponse(data);
}

export async function approvePendingApproval(approval: PendingApproval) {
  const url =
    approval.status === 'PENDING_ADMIN'
      ? `/households/${approval.household.id}/approve/`
      : `/households/${approval.household.id}/memberships/${approval.id}/approve/`;
  await api.post(url);
}

export async function rejectPendingApproval(
  approval: PendingApproval,
  reason: string = ''
) {
  const url =
    approval.status === 'PENDING_ADMIN'
      ? `/households/${approval.household.id}/reject/`
      : `/households/${approval.household.id}/memberships/${approval.id}/reject/`;
  await api.post(url, { reason });
}

export async function leaveHousehold(householdId: number) {
  await api.post(`/households/${householdId}/leave/`);
}

export async function listHouseholdDecisions(householdId: number) {
  const { data } = await api.get<
    MembershipDecision[] | { results?: MembershipDecision[] }
  >(`/households/${householdId}/decisions/`);
  return normalizeListResponse(data);
}
