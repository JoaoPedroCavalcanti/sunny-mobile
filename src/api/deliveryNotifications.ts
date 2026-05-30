import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type {
  DeliveryNotification,
  DeliveryPlatform,
  Priority
} from '@/types/domain';

export type DeliveryNotificationInput = {
  user_to_delivery: number;
  title: string;
  delivery_from: string;
  description?: string;
  delivery_platform?: DeliveryPlatform;
  delivery_to?: string;
  priority_level?: Priority;
};

export async function sendDeliveryNotification(payload: DeliveryNotificationInput) {
  const { data } = await api.post<DeliveryNotification>(
    '/delivery_notification/',
    payload
  );
  return data;
}

export async function listDeliveryNotifications() {
  const { data } = await api.get<
    DeliveryNotification[] | { results?: DeliveryNotification[] }
  >('/delivery_notification/list/');
  return normalizeListResponse(data);
}

export async function getDeliveryNotification(id: number) {
  const { data } = await api.get<DeliveryNotification>(
    `/delivery_notification/${id}/`
  );
  return data;
}
