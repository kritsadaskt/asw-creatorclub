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

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let session: SessionPayload | null = null;
  try {
    session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as SessionPayload;
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const role = session?.role;
  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (isCreatorsRoute && role !== 'admin' && role !== 'marketing') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/creators/:path*', '/admin/:path*'],
};

