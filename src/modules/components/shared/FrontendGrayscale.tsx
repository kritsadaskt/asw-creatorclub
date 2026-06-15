'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { BASE_PATH } from '@/lib/publicPath';

/** Paths (without basePath) that use the frontend grayscale overlay. */
const GRAYSCALE_PATHS = ['/', '/affiliate', '/friendgetfriends'] as const;

function normalizePath(pathname: string): string {
  const withoutBase = pathname.startsWith(BASE_PATH)
    ? pathname.slice(BASE_PATH.length) || '/'
    : pathname;
  if (withoutBase.endsWith('/') && withoutBase.length > 1) {
    return withoutBase.slice(0, -1);
  }
  return withoutBase;
}

function isGrayscalePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return GRAYSCALE_PATHS.some(
    (allowed) => path === allowed || (allowed !== '/' && path.startsWith(`${allowed}/`)),
  );
}

const BODY_CLASS = 'site-grayscale';

export function FrontendGrayscale({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const applyGrayscale = isGrayscalePath(pathname);

  useEffect(() => {
    if (applyGrayscale) {
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, [applyGrayscale]);

  return <>{children}</>;
}
