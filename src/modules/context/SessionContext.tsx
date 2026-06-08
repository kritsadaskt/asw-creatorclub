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
import { Toaster } from 'sonner';
import type { UserRole } from '@/modules/types';
import { clearSession, getSession, setSession } from '@/modules/utils/auth';
import { logout as storageLogout } from '@/modules/utils/storage';
import { installLocalStorageSafeGuard } from '@/modules/utils/localStorageSafe';
import { initFacebookSDK, isFacebookLoginEnabled } from '@/modules/utils/facebook';

type SessionContextValue = {
  currentUserId: string | null;
  userRole: UserRole | null;
  handleLogin: (id: string, role: UserRole, redirectTo?: string) => void;
  handleLogout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function getInitialSessionFromCookie(): { id: string | null; role: UserRole | null } {
  if (typeof window === 'undefined') {
    return { id: null, role: null };
  }
  const session = getSession();
  return {
    id: session?.id ?? null,
    role: session?.role ?? null,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [{ id: initialUserId, role: initialRole }] = useState(getInitialSessionFromCookie);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId);
  const [userRole, setUserRole] = useState<UserRole | null>(initialRole);

  useEffect(() => {
    installLocalStorageSafeGuard();
    if (isFacebookLoginEnabled()) {
      initFacebookSDK().catch((err) => {
        console.warn('Failed to initialize Facebook SDK:', err);
      });
    }
  }, []);

  const handleLogin = useCallback(
    (id: string, role: UserRole, redirectTo?: string) => {
      setCurrentUserId(id);
      setUserRole(role);
      setSession({ id, role });
      if (role === 'creator') {
        router.push(redirectTo ?? '/profile');
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'marketing') {
        router.push('/creators');
      }
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    storageLogout();
    setCurrentUserId(null);
    setUserRole(null);
    clearSession();
    router.push('/');
  }, [router]);

  const value = useMemo(
    () => ({
      currentUserId,
      userRole,
      handleLogin,
      handleLogout,
    }),
    [currentUserId, userRole, handleLogin, handleLogout],
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
