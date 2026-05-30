import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type {
  Priority,
  ServiceRequest,
  ServiceRequestStatus
} from '@/types/domain';

export type ServiceRequestInput = {
  requester_user: number;
  title: string;
  request_scheduled_date: string;
  request_description?: string;
  service_type?: string;
  location?: string;
  priority?: Priority;
  status?: ServiceRequestStatus;
  responsable_staff?: string;
  scheduled_date?: string | null;
  more_details?: string;
};

export async function listServiceRequests() {
  const { data } = await api.get<ServiceRequest[] | { results?: ServiceRequest[] }>(
    '/service_requests/'
  );
  return normalizeListResponse(data);
}

export async function getServiceRequest(id: number) {
  const { data } = await api.get<ServiceRequest>(`/service_requests/${id}/`);
  return data;
}

export async function createServiceRequest(payload: ServiceRequestInput) {
  const { data } = await api.post<ServiceRequest>('/service_requests/', payload);
  return data;
}

export async function patchServiceRequest(
  id: number,
  payload: Partial<ServiceRequestInput>
) {
  const { data } = await api.patch<ServiceRequest>(`/service_requests/${id}/`, payload);
  return data;
}

export async function deleteServiceRequest(id: number) {
  await api.delete(`/service_requests/${id}/`);
}

export async function acceptOrDeclineServiceRequest(
  id: number,
  action: 'accept' | 'decline'
) {
  const { data } = await api.patch<ServiceRequest>(
    `/service_requests/accept_or_decline/${id}/${action}/`,
    {}
  );
  return data;
}
