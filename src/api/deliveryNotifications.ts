import { api } from '@/api/client';
import type { DeliveryNotification } from '@/types/domain';

export async function sendDeliveryNotification(
  payload: Omit<DeliveryNotification, 'id' | 'created_at'>
) {
  const { data } = await api.post<DeliveryNotification>('/delivery_notification/', payload);
  return data;
}

export async function listDeliveryNotifications() {
  const { data } = await api.get<DeliveryNotification[]>('/delivery_notification/list/');
  return data;
}

export async function getDeliveryNotification(id: number) {
  const { data } = await api.get<DeliveryNotification>(`/delivery_notification/${id}/`);
  return data;
}
