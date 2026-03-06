import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { CreatorProfile } from './components/creator/CreatorProfile';
import { AffiliateGenerator } from './components/creator/AffiliateGenerator';
import { AffiliateBrowse } from './components/creator/AffiliateBrowse';
import { CreatorLayout } from './components/layout/CreatorLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProjectManagement } from './components/admin/ProjectManagement';
import { CampaignManagement } from './components/admin/CampaignManagement';
import { getCurrentUser, logout } from './utils/storage';
import { initFacebookSDK } from './utils/facebook';
import { UserRole } from './types';
import { clearSession, getSession, setSession } from './utils/auth';
import { RequireAuth } from './components/auth/RequireAuth';
import { LogOut } from 'lucide-react';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Initialize Facebook SDK on app mount
  useEffect(() => {
    initFacebookSDK().catch((err) => {
      console.warn('Failed to initialize Facebook SDK:', err);
    });
  }, []);

  useEffect(() => {
    const cookieSession = getSession();

    if (cookieSession) {
      setCurrentUserId(cookieSession.id);
      setUserRole(cookieSession.role);
      return;
    }

    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUserId(storedUser.id);
      setUserRole(storedUser.role);
      setSession({ id: storedUser.id, role: storedUser.role });
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
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route
          path="/"
          element={
            userRole === 'admin' ? (
              <Navigate to="admin" replace />
            ) : (
              <LandingPage onLogin={handleLogin} isLoggedIn={!!currentUserId} />
            )
          }
        />

        <Route path="creator" element={<Navigate to="profile" replace />} />
        <Route path="creator/*" element={<Navigate to="profile" replace />} />
        <Route
          path="profile/*"
          element={
            <RequireAuth requiredRole="creator">
              <CreatorLayout onLogout={handleLogout} />
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
              <AdminLayout onLogout={handleLogout} />
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
  onLogout: () => void;
}

function CreatorLayout({ onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a href="/creatorclub" className="cursor-pointer" title='Creator Club'>
              <img
                src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" alt="AssetWise Logo" className="h-5"
              />
            </a>
          </div>
          <div className="flex gap-4 items-center">
            <NavLink
              to=""
              end
              className={({ isActive }) =>
                `transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              โปรไฟล์
            </NavLink>
            <NavLink
              to="affiliate"
              className={({ isActive }) =>
                `transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              Affiliate Links
            </NavLink>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

function AdminLayout({ onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <a href="/creatorclub" className="cursor-pointer" title='Creator Club'>
                <img src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" alt="AssetWise Logo" className="h-5" />
              </a>
            </div>
            <button
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2"
            >
              ออกจากระบบ
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <NavLink
              to="/creatorclub/admin/dashboard"
              end
              className={({ isActive }) =>
                `pb-2 transition-colors border-b-2 ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`
              }
            >
              จัดการ Creators
            </NavLink>
            <NavLink
              to="/creatorclub/admin/projects"
              className={({ isActive }) =>
                `pb-2 transition-colors border-b-2 ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`
              }
            >
              จัดการโครงการ
            </NavLink>
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

