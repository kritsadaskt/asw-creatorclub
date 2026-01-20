import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { LoginRegister } from './components/auth/LoginRegister';
import { KOLProfile } from './components/kol/KOLProfile';
import { AffiliateGenerator } from './components/kol/AffiliateGenerator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { getCurrentUser, logout } from './utils/storage';
import { UserRole } from './types';

type KOLView = 'profile' | 'affiliate';

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [kolView, setKolView] = useState<KOLView>('profile');

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
    setKolView('profile');
  };

  // Not logged in
  if (!currentUserId || !userRole) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LoginRegister onLogin={handleLogin} />
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
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
              <h3 className="text-primary">ระบบจัดการ KOL - แดชบอร์ดผู้ดูแล</h3>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          </header>

          <AdminDashboard />
        </div>
      </>
    );
  }

  // KOL view
  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
        {/* Header */}
        <header className="bg-white border-b border-border shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <h3 className="text-primary">ระบบจัดการ KOL</h3>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => setKolView('profile')}
                className={`transition-colors ${
                  kolView === 'profile'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                โปรไฟล์
              </button>
              <button
                onClick={() => setKolView('affiliate')}
                className={`transition-colors ${
                  kolView === 'affiliate'
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
        {kolView === 'profile' ? (
          <KOLProfile kolId={currentUserId} onNavigate={setKolView} />
        ) : (
          <AffiliateGenerator kolId={currentUserId} onNavigate={setKolView} />
        )}
      </div>
    </>
  );
}