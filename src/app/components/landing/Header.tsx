import { useEffect, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { getCreatorById, logout } from '../../utils/storage';
import { getSession, clearSession } from '../../utils/auth';

interface HeaderProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

export function Header({ onLogin }: HeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<'creator' | 'admin' | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const isLoggedIn = !!role;

  useEffect(() => {
    const loadFromSession = async () => {
      const session = getSession();
      if (!session) {
        setDisplayName(null);
        setAvatarUrl(null);
        setRole(null);
        setIsLoadingProfile(false);
        return;
      }

      setRole(session.role);

      if (session.role === 'creator') {
        try {
          setIsLoadingProfile(true);
          const creator = await getCreatorById(session.id);
          if (creator) {
            setDisplayName(creator.name || null);
            setAvatarUrl(creator.profileImage || null);
          }
        } catch (error) {
          console.warn('Failed to load creator profile for header:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setDisplayName('Admin');
        setAvatarUrl(null);
        setIsLoadingProfile(false);
      }
    };

    void loadFromSession();
  }, []);

  const scrollToRegister = () => {
    const registerSection = document.getElementById('register-section');
    if (registerSection) {
      registerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    clearSession();
    setDisplayName(null);
    setAvatarUrl(null);
    setRole(null);
    window.location.href = '/creatorclub';
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-border shadow-sm z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg"
              alt="AssetWise Logo"
              className="h-5"
            />
          </div>
          <div className="flex gap-4 items-center">
            {isLoadingProfile ? (
              <>
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              </>
            ) : isLoggedIn ? (
              <>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || 'Profile'}
                    className="w-9 h-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                    {displayName ? displayName.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <div className="flex flex-col items-start">
                  {displayName && (
                    <span className="text-sm font-medium text-foreground">
                      {displayName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={scrollToRegister}
                  className="text-muted-foreground hover:text-accent transition-colors hidden md:block"
                >
                  ลงทะเบียน
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  เข้าสู่ระบบ
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="h-16"></div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
        />
      )}
    </>
  );
}