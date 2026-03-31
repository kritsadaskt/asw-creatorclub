import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASIC_AUTH_USER = 'online';
const BASIC_AUTH_PASS = 'CreatorsClub26';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/creators')) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Creators Directory"',
      },
    });
  }

  const base64Credentials = authHeader.slice('Basic '.length).trim();
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');

  if (user !== BASIC_AUTH_USER || pass !== BASIC_AUTH_PASS) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Creators Directory"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/creators/:path*'],
};

