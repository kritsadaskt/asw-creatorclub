'use client';

import { RequireAuth } from '@/modules/components/auth/RequireAuth';
import { Header } from '@/modules/components/landing/Header';
import { useSession } from '@/modules/context/SessionContext';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { handleLogout } = useSession();
  return (
    <RequireAuth requiredRole="creator">
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        <Header
          fixed={false}
          onLogout={handleLogout}
          navLinks={[
            { label: 'โปรไฟล์', to: '/profile', end: true },
            { label: 'Friend Get Friends', to: '/friendgetfriends' },
            { label: 'Affiliate Links', to: '/profile/affiliate' },
          ]}
        />
        {children}
      </div>
    </RequireAuth>
  );
}
