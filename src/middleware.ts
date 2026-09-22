import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'asw_session';
type SessionPayload = { role?: string };

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCreatorsRoute = pathname.startsWith('/creators');
  const isAdminRoute = pathname.startsWith('/admin');
  if (!isCreatorsRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const redirectHome = () => {
    // Use nextUrl so basePath (/creatorclub) is preserved — `new URL('/', request.url)`
    // would send users to the site root (e.g. assetwise.co.th/) instead.
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  };

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return redirectHome();
  }

  let session: SessionPayload | null = null;
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as SessionPayload;
  } catch {
    return redirectHome();
  }

  const role = session?.role;
  if (isAdminRoute && role !== 'admin') {
    return redirectHome();
  }
  if (isCreatorsRoute && role !== 'admin' && role !== 'marketing') {
    return redirectHome();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/creators/:path*', '/admin/:path*'],
};
