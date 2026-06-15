'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import type { UserRole } from '@/modules/types';
import { BASE_PATH } from '@/lib/publicPath';
import type { CreatorApprovalStatus } from '@/lib/creator-approval';
import { creatorApprovalBlockMessage, isCreatorApproved } from '@/lib/creator-approval';
import { clearSession, getSession, setSession } from '@/modules/utils/auth';
import { logout as storageLogout } from '@/modules/utils/storage';
import { installLocalStorageSafeGuard } from '@/modules/utils/localStorageSafe';
import { initFacebookSDK, isFacebookLoginEnabled } from '@/modules/utils/facebook';

type CreatorMeResponse = {
  canLogin?: boolean;
  canAccessCreatorDashboard?: boolean;
  canGenerateAffiliateLink?: boolean;
  approvalStatus?: CreatorApprovalStatus;
  blockMessage?: string | null;
};

type SessionContextValue = {
  currentUserId: string | null;
  userRole: UserRole | null;
  approvalStatus: CreatorApprovalStatus | null;
  isCreatorApproved: boolean;
  sessionReady: boolean;
  handleLogin: (id: string, role: UserRole, redirectTo?: string) => void;
  handleLogout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<CreatorApprovalStatus | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      installLocalStorageSafeGuard();
      if (isFacebookLoginEnabled()) {
        initFacebookSDK().catch((err) => {
          console.warn('Failed to initialize Facebook SDK:', err);
        });
      }

      const session = getSession();
      if (!session) {
        if (!cancelled) setSessionReady(true);
        return;
      }

      if (session.role !== 'creator') {
        if (!cancelled) {
          setCurrentUserId(session.id);
          setUserRole(session.role);
          setApprovalStatus(null);
          setSessionReady(true);
        }
        return;
      }

      try {
        const res = await fetch(`${BASE_PATH}/api/creators/me`, { credentials: 'include' });
        if (!res.ok) {
          clearSession();
          if (!cancelled) setSessionReady(true);
          return;
        }

        const data = (await res.json()) as CreatorMeResponse;
        if (!data.canLogin) {
          clearSession();
          if (!cancelled) setSessionReady(true);
          return;
        }

        if (!cancelled) {
          setCurrentUserId(session.id);
          setUserRole(session.role);
          setApprovalStatus(data.approvalStatus ?? null);
          setSessionReady(true);
        }
      } catch {
        clearSession();
        if (!cancelled) setSessionReady(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = useCallback(
    (id: string, role: UserRole, redirectTo?: string) => {
      setCurrentUserId(id);
      setUserRole(role);
      setSession({ id, role });

      if (role === 'creator') {
        void (async () => {
          try {
            const res = await fetch(`${BASE_PATH}/api/creators/me`, { credentials: 'include' });
            if (!res.ok) {
              clearSession();
              setCurrentUserId(null);
              setUserRole(null);
              setApprovalStatus(null);
              toast.error('ไม่สามารถเข้าสู่ระบบได้');
              return;
            }
            const data = (await res.json()) as CreatorMeResponse;
            if (!data.canLogin) {
              clearSession();
              setCurrentUserId(null);
              setUserRole(null);
              setApprovalStatus(null);
              toast.error(data.blockMessage || 'ไม่สามารถเข้าสู่ระบบได้');
              return;
            }
            setApprovalStatus(data.approvalStatus ?? null);
            toast.success('เข้าสู่ระบบสำเร็จ!');
            router.push(redirectTo ?? '/profile');
          } catch {
            toast.error('ไม่สามารถเข้าสู่ระบบได้');
          }
        })();
        return;
      }

      if (role === 'admin') {
        toast.success('เข้าสู่ระบบสำเร็จ!');
        router.push('/admin/dashboard');
      } else if (role === 'marketing') {
        toast.success('เข้าสู่ระบบสำเร็จ!');
        router.push('/creators');
      }
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    storageLogout();
    setCurrentUserId(null);
    setUserRole(null);
    setApprovalStatus(null);
    clearSession();
    router.push('/');
  }, [router]);

  const isCreatorApprovedFlag =
    userRole === 'creator' && approvalStatus != null && isCreatorApproved(approvalStatus);

  const value = useMemo(
    () => ({
      currentUserId,
      userRole,
      approvalStatus,
      isCreatorApproved: isCreatorApprovedFlag,
      sessionReady,
      handleLogin,
      handleLogout,
    }),
    [
      currentUserId,
      userRole,
      approvalStatus,
      isCreatorApprovedFlag,
      sessionReady,
      handleLogin,
      handleLogout,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      <Toaster position="top-center" richColors />
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
