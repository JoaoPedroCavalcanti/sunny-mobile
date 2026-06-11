import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { VisitorAccess, VisitorGroup, VisitorStatus } from '@/types/domain';

export type VisitorAccessInput = {
  visitor_name: string;
  scheduled_date: string;
  host_user?: number | null;
  email?: string;
  checkout_date_time?: string | null;
  description?: string | null;
  all_day?: boolean;
};

export type VisitorPeriod = 'future' | 'past';

export type ListVisitorsParams = {
  period?: VisitorPeriod;
  status?: VisitorStatus;
};

export type VisitorGroupMemberInput = {
  name: string;
  email?: string | null;
};

export type VisitorGroupInput = {
  name: string;
  members?: VisitorGroupMemberInput[];
};

export type VisitorGroupPatchInput = {
  name?: string;
  members?: VisitorGroupMemberInput[];
};

export type VisitorGroupScheduleInput = {
  scheduled_date: string;
  all_day?: boolean;
  checkout_date_time?: string | null;
  description?: string | null;
};

export async function listVisitors(params?: ListVisitorsParams) {
  const { data } = await api.get<VisitorAccess[] | { results?: VisitorAccess[] }>(
    '/visitor_access/',
    { params }
  );
  return normalizeListResponse(data);
}

export async function listVisitorGroupVisits(params?: ListVisitorsParams) {
  const { data } = await api.get<VisitorAccess[] | { results?: VisitorAccess[] }>(
    '/visitor_access/groups/visits/',
    { params }
  );
  return normalizeListResponse(data);
}

export async function getVisitor(id: number) {
  const { data } = await api.get<VisitorAccess>(`/visitor_access/${id}/`);
  return data;
}

export async function createVisitor(payload: VisitorAccessInput) {
  const { data } = await api.post<VisitorAccess>('/visitor_access/', payload);
  return data;
}

export async function deleteVisitor(id: number) {
  await api.delete(`/visitor_access/${id}/`);
}

export async function runVisitorCheckin(token: string) {
  const { data } = await api.get<{ checkin_code: string }>(
    `/visitor_access/checkin/${token}/`
  );
  return data;
}

export async function runVisitorCheckout(token: string) {
  const { data } = await api.get<{ checkout_code: string }>(
    `/visitor_access/checkout/${token}/`
  );
  return data;
}

export async function listVisitorGroups() {
  const { data } = await api.get<VisitorGroup[] | { results?: VisitorGroup[] }>(
    '/visitor_access/groups/'
  );
  return normalizeListResponse(data);
}

export async function getVisitorGroup(id: number) {
  const { data } = await api.get<VisitorGroup>(`/visitor_access/groups/${id}/`);
  return data;
}

export async function createVisitorGroup(payload: VisitorGroupInput) {
  const { data } = await api.post<VisitorGroup>('/visitor_access/groups/', payload);
  return data;
}

export async function updateVisitorGroup(id: number, payload: VisitorGroupPatchInput) {
  const { data } = await api.patch<VisitorGroup>(
    `/visitor_access/groups/${id}/`,
    payload
  );
  return data;
}

export async function deleteVisitorGroup(id: number) {
  await api.delete(`/visitor_access/groups/${id}/`);
}

export async function scheduleVisitorGroup(
  id: number,
  payload: VisitorGroupScheduleInput
) {
  const { data } = await api.post<VisitorAccess>(
    `/visitor_access/groups/${id}/schedule/`,
    payload
  );
  return data;
}
