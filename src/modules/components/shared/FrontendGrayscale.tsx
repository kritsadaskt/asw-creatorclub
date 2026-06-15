'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

const BODY_CLASS = 'site-grayscale';

export function FrontendGrayscale({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const applyGrayscale = !isAdminPath(pathname);

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
