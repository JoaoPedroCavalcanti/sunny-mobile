import { api } from '@/api/client';
import { normalizeListResponse } from '@/api/listResponse';
import type { Reservation } from '@/types/domain';

export type ReservationInput = {
  reservation_date: string;
  reservation_user?: number | null;
  guest_count?: number | null;
};

export type ReservationPatch = Partial<ReservationInput>;

export async function listBbqReservations() {
  const { data } = await api.get<Reservation[] | { results?: Reservation[] }>('/bbq/');
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

export async function listHallReservations() {
  const { data } = await api.get<Reservation[] | { results?: Reservation[] }>('/hall/');
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
