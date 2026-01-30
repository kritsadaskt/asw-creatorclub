import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { LandingPage } from './components/landing/LandingPage';
import { CreatorProfile } from './components/creator/CreatorProfile';
import { AffiliateGenerator } from './components/creator/AffiliateGenerator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProjectManagement } from './components/admin/ProjectManagement';
import { getCurrentUser, logout } from './utils/storage';
import { initFacebookSDK } from './utils/facebook';
import { UserRole } from './types';

type CreatorView = 'profile' | 'affiliate';
type AdminView = 'dashboard' | 'projects';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [creatorView, setCreatorView] = useState<CreatorView>('profile');
  const [adminView, setAdminView] = useState<AdminView>('dashboard');

  // Initialize Facebook SDK on app mount
  useEffect(() => {
    initFacebookSDK().catch((err) => {
      console.warn('Failed to initialize Facebook SDK:', err);
    });
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserId(user.id);
      setUserRole(user.role);
    }
  }, []);

  const handleLogin = (id: string, role: UserRole) => {
    setCurrentUserId(id);
    setUserRole(role);
  };

  const handleLogout = () => {
    logout();
    setCurrentUserId(null);
    setUserRole(null);
    setCreatorView('profile');
    setAdminView('dashboard');
  };

  // Not logged in
  if (!currentUserId || !userRole) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LandingPage onLogin={handleLogin} />
      </>
    );
  }

  // Admin view
  if (userRole === 'admin') {
    return (
      <>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
          {/* Header */}
          <header className="bg-white border-b border-border shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" 
                    alt="AssetWise Logo" 
                    className="h-5"
                  />
                </div>
                <button
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ออกจากระบบ
                </button>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setAdminView('dashboard')}
                  className={`pb-2 transition-colors border-b-2 ${
                    adminView === 'dashboard'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  จัดการ Creators
                </button>
                <button
                  onClick={() => setAdminView('projects')}
                  className={`pb-2 transition-colors border-b-2 ${
                    adminView === 'projects'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  จัดการโครงการ
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          {adminView === 'dashboard' ? (
            <AdminDashboard />
          ) : (
            <ProjectManagement />
          )}
        </div>
      </>
    );
  }

  // Creator view
  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        {/* Header */}
        <header className="bg-white border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" 
                alt="AssetWise Logo" 
                className="h-5"
              />
            </div>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => setCreatorView('profile')}
                className={`transition-colors ${
                  creatorView === 'profile'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                โปรไฟล์
              </button>
              <button
                onClick={() => setCreatorView('affiliate')}
                className={`transition-colors ${
                  creatorView === 'affiliate'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Affiliate Links
              </button>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        {creatorView === 'profile' ? (
          <CreatorProfile creatorId={currentUserId} onNavigate={setCreatorView} />
        ) : (
          <AffiliateGenerator creatorId={currentUserId} onNavigate={setCreatorView} />
        )}
      </div>
    </>
  );
}
