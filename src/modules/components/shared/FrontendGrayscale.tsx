'use client';

import { usePathname } from 'next/navigation';

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function FrontendGrayscale({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (isAdminPath(pathname)) {
    return <>{children}</>;
  }

  return <div className="site-grayscale">{children}</div>;
}
