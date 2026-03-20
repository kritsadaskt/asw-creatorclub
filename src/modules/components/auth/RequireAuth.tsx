'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '../../types';
import { getSession } from '../../utils/auth';

interface RequireAuthProps {
  requiredRole?: UserRole;
  children: ReactNode;
}

export function RequireAuth({ requiredRole, children }: RequireAuthProps) {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/');
      return;
    }
    if (requiredRole && session.role !== requiredRole) {
      router.replace('/');
    }
  }, [requiredRole, router]);

  const session = getSession();
  if (!session) {
    return (
      <div className="p-8 text-center text-muted-foreground">กำลังเปลี่ยนเส้นทาง...</div>
    );
  }
  if (requiredRole && session.role !== requiredRole) {
    return (
      <div className="p-8 text-center text-muted-foreground">กำลังเปลี่ยนเส้นทาง...</div>
    );
  }

  return <>{children}</>;
}
