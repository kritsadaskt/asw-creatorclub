'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BASE_PATH } from '@/lib/publicPath';
import type { CreatorApprovalStatus } from '@/lib/creator-approval';
import { clearSession, getSession } from '@/modules/utils/auth';

type GatePhase = 'checking' | 'allowed' | 'denied';

type CreatorMeResponse = {
  canLogin?: boolean;
  canAccessCreatorDashboard?: boolean;
  blockMessage?: string | null;
  approvalStatus?: CreatorApprovalStatus;
};

interface RequireApprovedCreatorProps {
  children: ReactNode;
}

/**
 * Creator dashboard guard — only `approval_status === 1` may access /profile routes.
 */
export function RequireApprovedCreator({ children }: RequireApprovedCreatorProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<GatePhase>('checking');

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      const session = getSession();
      if (!session || session.role !== 'creator') {
        if (!cancelled) {
          setPhase('denied');
          router.replace('/');
        }
        return;
      }

      try {
        const res = await fetch(`${BASE_PATH}/api/creators/me`, { credentials: 'include' });
        if (!res.ok) {
          clearSession();
          if (!cancelled) {
            setPhase('denied');
            router.replace('/');
          }
          return;
        }

        const data = (await res.json()) as CreatorMeResponse;
        if (!data.canLogin) {
          clearSession();
          toast.error(data.blockMessage || 'ไม่สามารถเข้าสู่ระบบได้');
          if (!cancelled) {
            setPhase('denied');
            router.replace('/');
          }
          return;
        }

        if (!data.canAccessCreatorDashboard) {
          toast.error(data.blockMessage || 'ยังไม่สามารถเข้าแดชบอร์ดได้');
          if (!cancelled) {
            setPhase('denied');
            router.replace('/');
          }
          return;
        }

        if (!cancelled) setPhase('allowed');
      } catch {
        if (!cancelled) {
          setPhase('denied');
          router.replace('/');
        }
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (phase === 'checking' || phase === 'denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-8 text-center text-muted-foreground">
        {phase === 'denied' ? 'กำลังเปลี่ยนเส้นทาง...' : 'กำลังโหลด...'}
      </div>
    );
  }

  return <>{children}</>;
}
