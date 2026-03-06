import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Header } from './components/landing/Header';
import { LandingPage } from './components/landing/LandingPage';
import { CreatorProfile } from './components/creator/CreatorProfile';
import { AffiliateGenerator } from './components/creator/AffiliateGenerator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProjectManagement } from './components/admin/ProjectManagement';
import { logout } from './utils/storage';
import { initFacebookSDK } from './utils/facebook';
import { UserRole } from './types';
import { clearSession, getSession, setSession } from './utils/auth';
import { RequireAuth } from './components/auth/RequireAuth';
import { installLocalStorageSafeGuard } from './utils/localStorageSafe';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Initialize localStorage guard and Facebook SDK on app mount
  useEffect(() => {
    installLocalStorageSafeGuard();

    initFacebookSDK().catch((err) => {
      console.warn('Failed to initialize Facebook SDK:', err);
    });
  }, []);

  useEffect(() => {
    const cookieSession = getSession();

    if (cookieSession) {
      setCurrentUserId(cookieSession.id);
      setUserRole(cookieSession.role);
    }
  }, []);

  const navigate = useNavigate();

  const handleLogin = (id: string, role: UserRole) => {
    setCurrentUserId(id);
    setUserRole(role);
    setSession({ id, role });
    if (role === 'creator') {
      navigate('profile');
    } else if (role === 'admin') {
      navigate('admin');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUserId(null);
    setUserRole(null);
    clearSession();
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage onLogin={handleLogin} isLoggedIn={!!currentUserId} />
          }
        />

        <Route path="creator" element={<Navigate to="profile" replace />} />
        <Route path="creator/*" element={<Navigate to="profile" replace />} />
        <Route
          path="profile/*"
          element={
            <RequireAuth requiredRole="creator">
              <CreatorLayout onLogin={handleLogin} onLogout={handleLogout} />
            </RequireAuth>
          }
        >
          <Route index element={<CreatorProfile creatorId={currentUserId!} />} />
          <Route
            path="affiliate"
            element={<AffiliateGenerator creatorId={currentUserId!} />}
          />
        </Route>

        <Route
          path="admin/*"
          element={
            <RequireAuth requiredRole="admin">
              <AdminLayout onLogin={handleLogin} onLogout={handleLogout} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="projects" element={<ProjectManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

interface LayoutProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
  onLogout: () => void;
}

function CreatorLayout({ onLogin, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <Header
        fixed={false}
        onLogout={onLogout}
        navLinks={[
          { label: 'โปรไฟล์', to: '/creatorclub/profile', end: true },
          { label: 'Affiliate Links', to: '/creatorclub/profile/affiliate' },
        ]}
      />
      <Outlet />
    </div>
  );
}

function AdminLayout({ onLogin, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <Header
        fixed={false}
        onLogout={onLogout}
        navTabs={[
          { label: 'จัดการ Creators', to: '/creatorclub/admin/dashboard', end: true },
          { label: 'จัดการโครงการ', to: '/creatorclub/admin/projects' },
        ]}
      />
      <Outlet />
    </div>
  );
}

