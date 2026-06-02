import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/domain';

export type Permissions = {
  role: UserRole | null;
  isAdmin: boolean;
  isResident: boolean;
  isEmployee: boolean;
  hasRole: (role: UserRole) => boolean;
};

export function usePermissions(): Permissions {
  const role = useAuthStore((state) => state.user?.role ?? null);
  return {
    role,
    isAdmin: role === 'ADMIN',
    isResident: role === 'RESIDENT',
    isEmployee: role === 'EMPLOYEE',
    hasRole: (r) => role === r
  };
}
