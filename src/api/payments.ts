import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { CondoPayment } from '@/types/domain';

export async function listCondoPayments() {
  const { data } = await api.get<CondoPayment[] | { results?: CondoPayment[] }>('/condo_payments/');
  return normalizeListResponse(data);
}

export async function createCondoPayment(payload: Omit<CondoPayment, 'id' | 'created_at' | 'updated_at'>) {
  const { data } = await api.post<CondoPayment>('/condo_payments/', payload);
  return data;
}

export async function patchCondoPayment(id: number, payload: Partial<CondoPayment>) {
  const { data } = await api.patch<CondoPayment>(`/condo_payments/${id}/`, payload);
  return data;
}

export async function deleteCondoPayment(id: number) {
  await api.delete(`/condo_payments/${id}/`);
}

export async function setPaymentsAsPaid(paidIds: number[]) {
  await api.patch('/condo_payments/set_paid_status/', { paid_payment_ids: paidIds });
}
