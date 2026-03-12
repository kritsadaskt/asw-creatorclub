import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { LoginModal } from './LoginModal';
import { getCreatorById, logout } from '../../utils/storage';
import { getSession, clearSession } from '../../utils/auth';
import { getProfileImageUrl } from '../../utils/profileImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface NavLinkItem {
  label: string;
  to: string;
  end?: boolean;
}

interface HeaderProps {
  /** Provide to enable the login modal on public pages. */
  onLogin?: (id: string, role: 'creator' | 'admin') => void;
  /** Override the default logout behaviour. Called after internal cleanup + redirect. */
  onLogout?: () => void;
  /** When this flips the header re-reads the session (use after login on the same page). */
  isLoggedInFromParent?: boolean;
  /** Nav links rendered inline in the header bar (creator-style). */
  navLinks?: NavLinkItem[];
  /** Nav tabs rendered in a second row below the top bar (admin-style). */
  navTabs?: NavLinkItem[];
  /** Fix the header to the top of the viewport. Defaults to true. */
  fixed?: boolean;
}

export function Header({
  onLogin,
  onLogout: onLogoutProp,
  isLoggedInFromParent,
  navLinks,
  navTabs,
  fixed = true,
}: HeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<'creator' | 'admin' | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const isLoggedIn = !!role;

  const loadFromSession = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadFromSession();
  }, [loadFromSession, isLoggedInFromParent]);

  const scrollToRegister = () => {
    const registerSection = document.getElementById('register-section');
    if (registerSection) {
      registerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // const { pathname } = useLocation();
  // const profileBase = pathname.startsWith('/creatorclub') ? '/creatorclub' : '/creatorclub';

  const handleLogout = () => {
    //onLogout?.();
    logout();
    clearSession();
    setDisplayName(null);
    setAvatarUrl(null);
    setRole(null);
    onLogoutProp?.();
    window.location.href = '/creatorclub/';
  };

  const handleLoginFromModal = (id: string, loginRole: 'creator' | 'admin') => {
    void loadFromSession();
    onLogin?.(id, loginRole);
  };

  const hasNavTabs = navTabs && navTabs.length > 0;

  return (
    <>
      <header
        className={`bg-white border-b border-border shadow-sm z-50 ${
          fixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
        }`}
      >
        <div className={`container mx-auto px-6 ${hasNavTabs ? 'pt-4' : 'py-4'}`}>
          {/* Top row: logo · [inline navLinks] · profile */}
          <div className={`flex justify-between items-center ${hasNavTabs ? 'mb-4' : ''}`}>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <a href="/creatorclub" className="cursor-pointer" title="Creator Club">
                <img
                  src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg"
                  alt="AssetWise Logo"
                  className="h-5"
                />
              </a>
            </div>

            {/* Right section */}
            <div className="flex gap-4 items-center">
              {/* Inline nav links (creator-style) */}
              {navLinks?.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              {/* Profile area */}
              {isLoadingProfile ? (
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
              ) : isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="focus:outline-none hover:ring-2 hover:ring-primary/30 rounded-full transition-all cursor-pointer"
                      aria-label="User menu"
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
                          {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          {role === 'admin' ? 'เข้าสู่ระบบในฐานะ' : 'ยินดีต้อนรับ'}
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {displayName ?? 'User'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {role === 'admin' && (
                      <DropdownMenuItem
                        onClick={() => { window.location.href = '/creatorclub/admin/dashboard'; }}
                        className="cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                    )}
                    {role === 'creator' && (
                      <DropdownMenuItem
                        onClick={() => { window.location.href = '/creatorclub/profile'; }}
                        className="cursor-pointer"
                      >
                        โปรไฟล์ของฉัน
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : onLogin ? (
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
              ) : null}
            </div>
          </div>

          {/* Second row: nav tabs (admin-style) */}
          {hasNavTabs && (
            <div className="flex gap-4">
              {navTabs!.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `pb-2 transition-colors border-b-2 ${
                      isActive
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </div>
          )}
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

      {/* Spacer so fixed header doesn't overlap content */}
      {fixed && <div className="h-16" />}

      {showLoginModal && onLogin && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginFromModal}
        />
      )}
    </>
  );
}
