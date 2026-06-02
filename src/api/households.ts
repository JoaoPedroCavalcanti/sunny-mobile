import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type {
  Household,
  HouseholdMembership,
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

export async function listMemberships(householdId: number) {
  const { data } = await api.get<
    HouseholdMembership[] | { results?: HouseholdMembership[] }
  >(`/households/${householdId}/memberships/`);
  return normalizeListResponse(data);
}

export async function deleteMembership(householdId: number, membershipId: number) {
  await api.delete(`/households/${householdId}/memberships/${membershipId}/`);
}

export async function promoteMembership(householdId: number, membershipId: number) {
  const { data } = await api.post<HouseholdMembership>(
    `/households/${householdId}/memberships/${membershipId}/promote/`
  );
  return data;
}

export async function demoteMembership(householdId: number, membershipId: number) {
  const { data } = await api.post<HouseholdMembership>(
    `/households/${householdId}/memberships/${membershipId}/demote/`
  );
  return data;
}

export async function transferHousehold(householdId: number, toUserId: number) {
  const { data } = await api.post<HouseholdMembership>(
    `/households/${householdId}/transfer/`,
    { to_user_id: toUserId }
  );
  return data;
}
