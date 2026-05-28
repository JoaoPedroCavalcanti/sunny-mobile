import { api } from '@/api/client';
import type { Reservation } from '@/types/domain';

export async function listBbqReservations() {
  const { data } = await api.get<Reservation[]>('/bbq/');
  return data;
}

export async function createBbqReservation(payload: {
  reservation_date: string;
  guest_count?: number;
}) {
  const { data } = await api.post<Reservation>('/bbq/', payload);
  return data;
}

export async function patchBbqReservation(id: number, payload: Partial<Reservation>) {
  const { data } = await api.patch<Reservation>(`/bbq/${id}/`, payload);
  return data;
}

export async function deleteBbqReservation(id: number) {
  await api.delete(`/bbq/${id}/`);
}

export async function listHallReservations() {
  const { data } = await api.get<Reservation[]>('/hall/');
  return data;
}

export async function createHallReservation(payload: {
  reservation_date: string;
  guest_count?: number;
}) {
  const { data } = await api.post<Reservation>('/hall/', payload);
  return data;
}

export async function patchHallReservation(id: number, payload: Partial<Reservation>) {
  const { data } = await api.patch<Reservation>(`/hall/${id}/`, payload);
  return data;
}

export async function deleteHallReservation(id: number) {
  await api.delete(`/hall/${id}/`);
}
