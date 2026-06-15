import { NextRequest } from 'next/server';
import type { SessionData } from '@/modules/utils/auth';

const SESSION_COOKIE_NAME = 'asw_session';

export function encodeSessionCookie(session: SessionData): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function createRequestWithSession(
  session: SessionData | null,
  url = 'http://localhost/creatorclub/api/creators/me',
  init?: RequestInit,
): NextRequest {
  const headers = new Headers(init?.headers);
  if (session) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${encodeSessionCookie(session)}`);
  }
  return new NextRequest(url, { ...init, headers });
}

export async function readJson<T>(response: Response): Promise<{ status: number; body: T }> {
  const body = (await response.json()) as T;
  return { status: response.status, body };
}
