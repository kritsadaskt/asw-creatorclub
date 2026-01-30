import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
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

type AdminView = 'dashboard' | 'projects' | 'campaigns';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
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
    setAdminView('dashboard');
  };

  // Admin view (remains state-based)
  if (currentUserId && userRole === 'admin') {
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
                <button
                  onClick={() => setAdminView('campaigns')}
                  className={`pb-2 transition-colors border-b-2 ${
                    adminView === 'campaigns'
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  จัดการแคมเปญ
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          {adminView === 'dashboard' ? (
            <AdminDashboard />
          ) : adminView === 'projects' ? (
            <ProjectManagement />
          ) : (
            <CampaignManagement />
          )}
        </div>
      </>
    );
  }

  // Creator and public routes with React Router
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* Public route - Landing page */}
        <Route 
          path="/" 
          element={
            currentUserId && userRole === 'creator' ? (
              <Navigate to="/profile" replace />
            ) : (
              <LandingPage onLogin={handleLogin} />
            )
          } 
        />

        {/* Protected creator routes */}
        {currentUserId && userRole === 'creator' ? (
          <Route element={<CreatorLayout onLogout={handleLogout} />}>
            <Route path="/profile" element={<CreatorProfile creatorId={currentUserId} />} />
            <Route path="/affiliate" element={<AffiliateBrowse creatorId={currentUserId} />} />
            <Route path="/links" element={<AffiliateGenerator creatorId={currentUserId} />} />
          </Route>
        ) : (
          <>
            {/* Redirect to landing if not logged in */}
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/affiliate" element={<Navigate to="/" replace />} />
            <Route path="/links" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
