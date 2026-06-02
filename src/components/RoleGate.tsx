import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types/domain';

type RoleGateProps = {
  role?: UserRole;
  roles?: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function RoleGate({ role, roles, fallback = null, children }: RoleGateProps) {
  const { role: currentRole } = usePermissions();
  const allowed = roles ?? (role ? [role] : []);
  if (!currentRole || !allowed.includes(currentRole)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
