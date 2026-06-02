import { api } from '@/api/client';
import type { AdminDashboardOverview } from '@/types/domain';

export async function getAdminDashboardOverview() {
  const { data } = await api.get<AdminDashboardOverview>('/admin_dashboard/overview/');
  return data;
}
