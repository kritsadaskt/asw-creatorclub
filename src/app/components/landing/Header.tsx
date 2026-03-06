import { useEffect, useState } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { LogIn, LogOut, User, Users, Link2 } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { getCreatorById, logout } from '../../utils/storage';
import { getSession, clearSession } from '../../utils/auth';
import { getProfileImageUrl } from '../../utils/profileImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HeaderProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
  onLogout?: () => void;
}

export function Header({ onLogin, onLogout }: HeaderProps) {
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
            setAvatarUrl(getProfileImageUrl(creator) ?? null);
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

  const { pathname } = useLocation();
  const profileBase = pathname.startsWith('/creatorclub') ? '/creatorclub' : '/creatorclub';

  const handleLogout = () => {
    onLogout?.();
    logout();
    clearSession();
    setDisplayName(null);
    setAvatarUrl(null);
    setRole(null);
    window.location.href = '/creatorclub';
  };

  const isOnCreatorProfile = pathname.startsWith('/creatorclub/profile');
  const isOnAdmin = pathname.startsWith('/creatorclub/admin');
  const hasSecondaryNav = isOnCreatorProfile || isOnAdmin;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-border shadow-sm z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/creatorclub" className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
              <img
                src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg"
                alt="AssetWise Logo"
                className="h-5"
              />
            </Link>
          </div>
          <div className="flex gap-4 items-center">
            {isLoadingProfile ? (
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            ) : isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="เปิดเมนูโปรไฟล์"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName || 'Profile'}
                        className="w-9 h-9 rounded-full object-cover border border-border"
                        onError={() => setAvatarUrl(null)}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px] p-2">
                  <DropdownMenuItem asChild>
                    <Link to={`${profileBase}/profile`} className="flex items-center gap-2 cursor-pointer group">
                      <User className="w-4 h-4 group-hover:stroke-white" />
                      <span>โปรไฟล์</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/friendgetfriend" className="flex items-center gap-2 cursor-pointer group">
                      <Users className="w-4 h-4 group-hover:stroke-white" />
                      <span>Friend get friend</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/affiliate" className="flex items-center gap-2 cursor-pointer group">
                      <Link2 className="w-4 h-4 group-hover:stroke-white" />
                      <span>Affiliate</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
        {/* {hasSecondaryNav && (
          <div className="container mx-auto px-6 border-t border-border bg-white">
            {isOnCreatorProfile && (
              <div className="flex gap-6 py-3">
                <NavLink
                  to="/creatorclub/profile"
                  end
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  โปรไฟล์
                </NavLink>
                <NavLink
                  to="/creatorclub/profile/affiliate"
                  className={({ isActive }) =>
                    `text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  Affiliate Links
                </NavLink>
              </div>
            )}
            {isOnAdmin && (
              <div className="flex gap-6 py-3">
                <NavLink
                  to="/creatorclub/admin/dashboard"
                  end
                  className={({ isActive }) =>
                    `text-sm font-medium pb-2 border-b-2 transition-colors ${
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
                    `text-sm font-medium pb-2 border-b-2 transition-colors ${
                      isActive
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`
                  }
                >
                  จัดการโครงการ
                </NavLink>
              </div>
            )}
          </div>
        )} */}
      </header>
      <div className='h-16' />

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
        />
      )}
    </>
  );
}