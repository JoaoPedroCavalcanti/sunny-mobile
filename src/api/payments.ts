import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { CondoPayment, CondoPaymentStatus } from '@/types/domain';

export type CondoPaymentInput = {
  payer_user: number;
  title: string;
  payment_link: string;
  status?: CondoPaymentStatus;
  description?: string | null;
  amount?: string;
  due_date?: string | null;
  payment_date?: string | null;
};

export async function listCondoPayments() {
  const { data } = await api.get<CondoPayment[] | { results?: CondoPayment[] }>(
    '/condo_payments/'
  );
  return normalizeListResponse(data);
}

export async function getCondoPayment(id: number) {
  const { data } = await api.get<CondoPayment>(`/condo_payments/${id}/`);
  return data;
}

export async function createCondoPayment(payload: CondoPaymentInput) {
  const { data } = await api.post<CondoPayment>('/condo_payments/', payload);
  return data;
}

export async function updateCondoPayment(id: number, payload: CondoPaymentInput) {
  const { data } = await api.put<CondoPayment>(`/condo_payments/${id}/`, payload);
  return data;
}

export async function patchCondoPayment(id: number, payload: Partial<CondoPaymentInput>) {
  const { data } = await api.patch<CondoPayment>(`/condo_payments/${id}/`, payload);
  return data;
}

export async function deleteCondoPayment(id: number) {
  await api.delete(`/condo_payments/${id}/`);
}

export async function setPaymentsAsPaid(paidIds: number[]) {
  await api.patch('/condo_payments/set_paid_status/', { paid_payment_ids: paidIds });
}
