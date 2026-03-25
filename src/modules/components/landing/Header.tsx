'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, LogOut, User } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { BASE_PATH } from '@/lib/publicPath';
import { useSession } from '@/modules/context/SessionContext';
import { getCreatorById } from '../../utils/storage';
import { getSession } from '../../utils/auth';
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
  const { handleLogout: sessionLogout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  /** Path without basePath for reliable active matching */
  const pathWithoutBase =
    pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || '/' : pathname;
  const normalizedPath =
    pathWithoutBase.endsWith('/') && pathWithoutBase.length > 1
      ? pathWithoutBase.slice(0, -1)
      : pathWithoutBase;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<'creator' | 'admin' | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);


  if (!navLinks || navLinks.length < 1) {
    navLinks = [
      { label: 'Friend Get Friend', to: '/friendgetfriend' },
      { label: 'Affiliate', to: '/affiliate' },
    ];
  }

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

  const handleLogout = () => {
    setDisplayName(null);
    setAvatarUrl(null);
    setRole(null);
    if (onLogoutProp) {
      onLogoutProp();
    } else {
      sessionLogout();
    }
  };

  const handleLoginFromModal = (id: string, loginRole: 'creator' | 'admin') => {
    void loadFromSession();
    onLogin?.(id, loginRole);
  };

  const hasNavTabs = navTabs && navTabs.length > 0;

  const UserDropdownMenu = () => {
    return (
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
              <span className="font-semibold text-foreground truncate">
                {displayName ?? 'User'}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === 'admin' && (
            <DropdownMenuItem
              onClick={() => { router.push('/admin/dashboard'); }}
              className="cursor-pointer group"
            >
              <LayoutDashboard className="w-4 h-4 mr-2 group-hover:stroke-white" />
              Dashboard
            </DropdownMenuItem>
          )}
          {role === 'creator' && (
            <DropdownMenuItem
              onClick={() => { router.push('/profile'); }}
              className="cursor-pointer group"
            >
              <User className="w-4 h-4 mr-2 group-hover:stroke-white" />
              โปรไฟล์ของฉัน
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:text-destructive group"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:stroke-white" />
            <span className="group-hover:text-white">ออกจากระบบ</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const MainMenu = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
    return (
      <>
        {navLinks && navLinks.length > 0 && (
          <div className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link key={link.to} href={link.to} className='cursor-pointer hover:text-primary border-r border-border pr-4'>{link.label}</Link>
            ))}
          </div>
        )}
        {isLoggedIn ? <UserDropdownMenu /> : (
          <>
            <Link href="/#register-section" className='cursor-pointer hover:text-primary'>ลงทะเบียน</Link>
            <button onClick={() => setShowLoginModal(true)} className='bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 cursor-pointer'>เข้าสู่ระบบ</button>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <header
        className={`bg-white border-b border-border shadow-sm z-50 ${
          fixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
        }`}
      >
        <div className={`container mx-auto px-4 md:px-6 ${hasNavTabs ? 'pt-4' : 'py-3 md:py-4'}`}>
          {/* Top row: logo · [inline navLinks] · profile */}
          <div className={`flex justify-between items-center ${hasNavTabs ? 'mb-4' : ''}`}>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="cursor-pointer" title="Creator Club">
                <img
                  src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg"
                  alt="AssetWise Logo"
                  className="h-4 md:h-5"
                />
              </Link>
            </div>

            {/* Right section */}
            <div className="flex gap-4 items-center">
              
              {/* Inline nav links (creator-style) */}
              <MainMenu isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Second row: nav tabs (admin-style) */}
          {hasNavTabs && (
            <div className="flex gap-4">
              {navTabs!.map((tab) => {
                const isActive = tab.end
                  ? normalizedPath === tab.to
                  : normalizedPath === tab.to || normalizedPath.startsWith(`${tab.to}/`);
                return (
                  <Link
                    key={tab.to}
                    href={tab.to}
                    className={`pb-2 transition-colors border-b-2 ${
                      isActive
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
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
