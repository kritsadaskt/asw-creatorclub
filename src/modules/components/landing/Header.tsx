'use client';

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, User, Users, X } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { BASE_PATH } from '@/lib/publicPath';
import { useSession } from '@/modules/context/SessionContext';
import { CREATOR_PROFILE_UPDATED_EVENT, getCreatorById } from '../../utils/storage';
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
  onLogin?: (id: string, role: 'creator' | 'admin' | 'marketing') => void;
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

type HeaderNavRouter = { push: (href: string) => void };

function isNavItemActive(link: Pick<NavLinkItem, 'to' | 'end'>, normalizedPath: string) {
  if (link.to.includes('#')) return false;
  if (link.end) return normalizedPath === link.to;
  return normalizedPath === link.to || normalizedPath.startsWith(`${link.to}/`);
}

type MobileMenuEntry =
  | { type: 'link'; key: string; label: string; to: string; end?: boolean }
  | { type: 'action'; key: string; label: string; onSelect: () => void; destructive?: boolean };

function pushMobileLink(entries: MobileMenuEntry[], link: NavLinkItem) {
  if (entries.some((entry) => entry.type === 'link' && entry.to === link.to)) return;
  entries.push({
    type: 'link',
    key: link.to,
    label: link.label,
    to: link.to,
    end: link.end,
  });
}

/** Stable component identity — avoids remounting Radix menus every Header render. */
function HeaderUserDropdownMenu({
  avatarUrl,
  displayName,
  role,
  creatorApproved,
  onAvatarLoadError,
  onLogout,
  router,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  role: 'creator' | 'admin' | 'marketing' | null;
  creatorApproved: boolean;
  onAvatarLoadError: () => void;
  onLogout: () => void;
  router: HeaderNavRouter;
}) {
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
              onError={onAvatarLoadError}
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
            <span className="font-semibold text-foreground truncate">{displayName ?? 'User'}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(role === 'admin' || role === 'marketing') && (
          <>
            {(role === 'admin' && (
              <DropdownMenuItem
                onClick={() => {
                  router.push(role === 'admin' ? '/admin/dashboard' : '/creators');
                }}
                className="cursor-pointer group"
              >
                <LayoutDashboard className="w-4 h-4 mr-2 group-hover:stroke-white" />
                Dashboard
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => {
                router.push('/creators');
              }}
              className="cursor-pointer group"
            >
            <Users className="w-4 h-4 mr-2 group-hover:stroke-white" />
              Creators
            </DropdownMenuItem>
          </>
        )}
        {role === 'creator' && creatorApproved && (
          <DropdownMenuItem
            onClick={() => {
              router.push('/profile');
            }}
            className="cursor-pointer group"
          >
            <User className="w-4 h-4 mr-2 group-hover:stroke-white" />
            โปรไฟล์ของฉัน
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-destructive focus:text-destructive group"
        >
          <LogOut className="w-4 h-4 mr-2 group-hover:stroke-white" />
          <span className="group-hover:text-white">ออกจากระบบ</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderMainMenu({
  navLinks,
  isLoggedIn,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onOpenLoginModal,
  userDropdown,
}: {
  navLinks: NavLinkItem[];
  isLoggedIn: boolean;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onOpenLoginModal: () => void;
  userDropdown: ReactNode;
}) {
  return (
    <>
      <div className="hidden items-center gap-4 md:flex">
        {navLinks.length > 0 && (
          <div className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                href={link.to}
                className="cursor-pointer border-r border-border pr-4 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {isLoggedIn ? (
          userDropdown
        ) : (
          <>
            <Link href="/#register-section" className="cursor-pointer hover:text-primary">
              สมัครเป็นครีเอเตอร์
            </Link>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
            >
              เข้าสู่ระบบ
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleMobileMenu}
        className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 md:hidden"
        aria-label={isMobileMenuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-nav-panel"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </>
  );
}

export function Header({
  onLogin,
  onLogout: onLogoutProp,
  isLoggedInFromParent,
  navLinks,
  navTabs,
  fixed = true,
}: HeaderProps) {
  const { handleLogout: sessionLogout, handleLogin: sessionLogin, isCreatorApproved } = useSession();
  const loginHandler = onLogin ?? sessionLogin;
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
  const [role, setRole] = useState<'creator' | 'admin' | 'marketing' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  if (!navLinks || navLinks.length < 1) {
    navLinks = [
      { label: 'Friend Get Friends', to: '/friendgetfriends' },
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
      return;
    }

    setRole(session.role);

    if (session.role === 'creator') {
      try {
        const creator = await getCreatorById(session.id);
        if (creator) {
          setDisplayName(creator.name || null);
          setAvatarUrl(getProfileImageUrl(creator) ?? null);
        }
      } catch (error) {
        console.warn('Failed to load creator profile for header:', error);
      }
    } else {
      setDisplayName(session.role === 'marketing' ? 'Marketing' : 'Admin');
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    void loadFromSession();
  }, [loadFromSession, isLoggedInFromParent]);

  useEffect(() => {
    const onProfileUpdated = () => {
      void loadFromSession();
    };
    window.addEventListener(CREATOR_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(CREATOR_PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, [loadFromSession]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

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

  const handleLoginFromModal = (id: string, loginRole: 'creator' | 'admin' | 'marketing') => {
    void loadFromSession();
    loginHandler(id, loginRole);
  };

  const hasNavTabs = navTabs && navTabs.length > 0;
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const mobileMenuEntries: MobileMenuEntry[] = [];
  if (hasNavTabs) {
    for (const tab of navTabs) pushMobileLink(mobileMenuEntries, tab);
  }
  for (const link of navLinks) pushMobileLink(mobileMenuEntries, link);
  if (!isLoggedIn) {
    pushMobileLink(mobileMenuEntries, { label: 'สมัครเป็นครีเอเตอร์', to: '/#register-section' });
    mobileMenuEntries.push({
      type: 'action',
      key: 'login',
      label: 'เข้าสู่ระบบ',
      onSelect: () => {
        closeMobileMenu();
        setShowLoginModal(true);
      },
    });
  } else {
    const hasCreatorsLink = mobileMenuEntries.some((entry) => entry.type === 'link' && entry.to === '/creators');
    const hasProfileLink = mobileMenuEntries.some((entry) => entry.type === 'link' && entry.to === '/profile');
    if (role === 'admin') {
      mobileMenuEntries.push({
        type: 'link',
        key: 'dashboard',
        label: 'Dashboard',
        to: '/admin/dashboard',
        end: true,
      });
    }
    if ((role === 'admin' || role === 'marketing') && !hasCreatorsLink) {
      pushMobileLink(mobileMenuEntries, { label: 'Creators', to: '/creators' });
    }
    if (role === 'creator' && isCreatorApproved && !hasProfileLink) {
      pushMobileLink(mobileMenuEntries, { label: 'โปรไฟล์ของฉัน', to: '/profile', end: true });
    }
    mobileMenuEntries.push({
      type: 'action',
      key: 'logout',
      label: 'ออกจากระบบ',
      destructive: true,
      onSelect: () => {
        closeMobileMenu();
        handleLogout();
      },
    });
  }

  const userDropdown = (
    <HeaderUserDropdownMenu
      avatarUrl={avatarUrl}
      displayName={displayName}
      role={role}
      creatorApproved={isCreatorApproved}
      onAvatarLoadError={() => setAvatarUrl(null)}
      onLogout={handleLogout}
      router={router}
    />
  );

  return (
    <>
      <header
        className={`bg-white border-b border-border shadow-sm z-50 ${
          fixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
        }`}
      >
        <div className={`container mx-auto px-4 md:px-6 ${hasNavTabs ? 'pt-4' : 'py-3 md:py-4'}`}>
          <div className={`flex items-center justify-between ${hasNavTabs ? 'md:mb-4' : ''}`}>
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
              <HeaderMainMenu
                navLinks={navLinks}
                isLoggedIn={isLoggedIn}
                isMobileMenuOpen={isMobileMenuOpen}
                onToggleMobileMenu={() => setIsMobileMenuOpen((open) => !open)}
                onOpenLoginModal={() => setShowLoginModal(true)}
                userDropdown={userDropdown}
              />
            </div>
          </div>

          {hasNavTabs && (
            <div className="hidden gap-4 md:flex">
              {navTabs.map((tab) => {
                const isActive = isNavItemActive(tab, normalizedPath);
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

      <div
        className={`fixed inset-0 z-[60] md:hidden ${isMobileMenuOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
      >
        <button
          type="button"
          tabIndex={isMobileMenuOpen ? 0 : -1}
          aria-label="ปิดเมนู"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMobileMenu}
        />
        <nav
          id="mobile-nav-panel"
          aria-label="เมนู"
          className={`absolute top-0 right-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ease-out ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-medium text-foreground">เมนู</p>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted/50"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto py-2">
            {mobileMenuEntries.map((entry) => {
              if (entry.type === 'link') {
                const isActive = isNavItemActive(entry, normalizedPath);
                return (
                  <li key={entry.key}>
                    <Link
                      href={entry.to}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={closeMobileMenu}
                      className={`block px-4 py-3 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {entry.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={entry.onSelect}
                    className={`block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                      entry.destructive ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {entry.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {fixed && <div className="h-[65px] md:h-16" aria-hidden />}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginFromModal}
        />
      )}
    </>
  );
}
