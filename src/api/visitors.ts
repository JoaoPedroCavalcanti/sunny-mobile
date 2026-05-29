import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { VisitorAccess } from '@/types/domain';

export async function listVisitors() {
  const { data } = await api.get<VisitorAccess[] | { results?: VisitorAccess[] }>('/visitor_access/');
  return normalizeListResponse(data);
}

export async function createVisitor(payload: {
  visitor_name: string;
  email: string;
  scheduled_date: string;
  description?: string;
}) {
  const { data } = await api.post<VisitorAccess>('/visitor_access/', payload);
  return data;
}

export async function patchVisitor(id: number, payload: Partial<VisitorAccess>) {
  const { data } = await api.patch<VisitorAccess>(`/visitor_access/${id}/`, payload);
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
