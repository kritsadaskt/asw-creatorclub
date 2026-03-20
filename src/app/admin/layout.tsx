'use client';

import { RequireAuth } from '@/modules/components/auth/RequireAuth';
import { Header } from '@/modules/components/landing/Header';
import { useSession } from '@/modules/context/SessionContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { handleLogout } = useSession();
  return (
    <RequireAuth requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        <Header
          fixed={false}
          onLogout={handleLogout}
          navTabs={[
            { label: 'จัดการ Creators', to: '/admin/dashboard', end: true },
            { label: 'จัดการโครงการ', to: '/admin/projects' },
          ]}
        />
        {children}
      </div>
    </RequireAuth>
  );
}
