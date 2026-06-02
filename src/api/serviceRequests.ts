import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type {
  ServiceRequest,
  ServiceRequestPriority,
  ServiceRequestStatus,
  ServiceType
} from '@/types/domain';

export type ServiceRequestCreateInput = {
  title: string;
  description?: string;
  service_type?: ServiceType;
  location?: string;
  priority?: ServiceRequestPriority;
  request_scheduled_date?: string | null;
};

export type ServiceRequestPatchInput = Partial<{
  title: string;
  description: string;
  service_type: ServiceType;
  location: string;
  priority: ServiceRequestPriority;
  request_scheduled_date: string | null;
}>;

export type ServiceRequestListFilters = {
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
  service_type?: ServiceType;
};

export type ServiceRequestRespondInput = {
  action: 'accept' | 'decline';
  response: string;
};

export async function listServiceRequests(filters?: ServiceRequestListFilters) {
  const { data } = await api.get<ServiceRequest[] | { results?: ServiceRequest[] }>(
    '/service_requests/',
    { params: filters }
  );
  return normalizeListResponse(data);
}

export async function getServiceRequest(id: number) {
  const { data } = await api.get<ServiceRequest>(`/service_requests/${id}/`);
  return data;
}

export async function createServiceRequest(payload: ServiceRequestCreateInput) {
  const { data } = await api.post<ServiceRequest>('/service_requests/', payload);
  return data;
}

export async function patchServiceRequest(
  id: number,
  payload: ServiceRequestPatchInput
) {
  const { data } = await api.patch<ServiceRequest>(`/service_requests/${id}/`, payload);
  return data;
}

export async function deleteServiceRequest(id: number) {
  await api.delete(`/service_requests/${id}/`);
}

export async function respondServiceRequest(
  id: number,
  payload: ServiceRequestRespondInput
) {
  const { data } = await api.post<ServiceRequest>(
    `/service_requests/${id}/respond/`,
    payload
  );
  return data;
}

export async function completeServiceRequest(id: number) {
  const { data } = await api.post<ServiceRequest>(
    `/service_requests/${id}/complete/`,
    {}
  );
  return data;
}
