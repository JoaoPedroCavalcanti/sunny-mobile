import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { Reservation, ReservationStatus } from '@/types/domain';

export type ReservationInput = {
  reservation_date: string;
  start_time?: string | null;
  end_time?: string | null;
  guest_count?: number | null;
  reservation_user?: number | null;
};

export type ReservationPatch = Partial<ReservationInput>;

export type ListReservationsParams = {
  status?: ReservationStatus;
};

export async function listBbqReservations(params?: ListReservationsParams) {
  const { data } = await api.get<Reservation[] | { results?: Reservation[] }>('/bbq/', {
    params
  });
  return normalizeListResponse(data);
}

export async function getBbqReservation(id: number) {
  const { data } = await api.get<Reservation>(`/bbq/${id}/`);
  return data;
}

export async function createBbqReservation(payload: ReservationInput) {
  const { data } = await api.post<Reservation>('/bbq/', payload);
  return data;
}

export async function patchBbqReservation(id: number, payload: ReservationPatch) {
  const { data } = await api.patch<Reservation>(`/bbq/${id}/`, payload);
  return data;
}

export async function deleteBbqReservation(id: number) {
  await api.delete(`/bbq/${id}/`);
}

export async function approveBbqReservation(id: number) {
  const { data } = await api.post<Reservation>(`/bbq/${id}/approve/`);
  return data;
}

export async function rejectBbqReservation(id: number) {
  const { data } = await api.post<Reservation>(`/bbq/${id}/reject/`);
  return data;
}

export async function listHallReservations(params?: ListReservationsParams) {
  const { data } = await api.get<Reservation[] | { results?: Reservation[] }>('/hall/', {
    params
  });
  return normalizeListResponse(data);
}

export async function getHallReservation(id: number) {
  const { data } = await api.get<Reservation>(`/hall/${id}/`);
  return data;
}

export async function createHallReservation(payload: ReservationInput) {
  const { data } = await api.post<Reservation>('/hall/', payload);
  return data;
}

export async function patchHallReservation(id: number, payload: ReservationPatch) {
  const { data } = await api.patch<Reservation>(`/hall/${id}/`, payload);
  return data;
}

export async function deleteHallReservation(id: number) {
  await api.delete(`/hall/${id}/`);
}

export async function approveHallReservation(id: number) {
  const { data } = await api.post<Reservation>(`/hall/${id}/approve/`);
  return data;
}

export async function rejectHallReservation(id: number) {
  const { data } = await api.post<Reservation>(`/hall/${id}/reject/`);
  return data;
}
