'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '../../types';
import { getSession } from '../../utils/auth';

interface RequireAuthProps {
  requiredRole?: UserRole;
  children: ReactNode;
}

type GatePhase = 'checking' | 'allowed' | 'denied';

/**
 * Session lives in `document.cookie`, so `getSession()` is always null during SSR.
 * Never branch on getSession() during render before mount — that diverges from the
 * client and breaks hydration. We show a stable shell until useEffect validates.
 */
export function RequireAuth({ requiredRole, children }: RequireAuthProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<GatePhase>('checking');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setPhase('denied');
      router.replace('/');
      return;
    }
    if (requiredRole && session.role !== requiredRole) {
      setPhase('denied');
      router.replace('/');
      return;
    }
    setPhase('allowed');
  }, [requiredRole, router]);

  if (phase === 'checking' || phase === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-8 text-center text-muted-foreground">
        {phase === 'denied' ? 'กำลังเปลี่ยนเส้นทาง...' : 'กำลังโหลด...'}
      </div>
    );
  }

  return <>{children}</>;
}
