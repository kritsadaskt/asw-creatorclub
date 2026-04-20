import type { NextRequest } from 'next/server';

export type SessionRole = 'creator' | 'admin' | 'marketing';

export interface SessionData {
  id: string;
  role: SessionRole;
}

const SESSION_COOKIE_NAME = 'asw_session';

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function encodeSession(session: SessionData): string {
  try {
    return btoa(JSON.stringify(session));
  } catch {
    return '';
  }
}

function decodeSession(value: string): SessionData | null {
  try {
    const json = atob(value);
    const parsed = JSON.parse(json) as SessionData;
    if (
      typeof parsed.id === 'string' &&
      (parsed.role === 'creator' || parsed.role === 'admin' || parsed.role === 'marketing')
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSession(
  session: SessionData,
  options?: { maxAgeSeconds?: number }
): void {
  const encoded = encodeSession(session);
  if (!encoded) return;

  const maxAge = options?.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}`;
}

export function getSession(): SessionData | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const sessionCookie = cookies.find((cookie) =>
    cookie.startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionCookie) return null;

  const value = sessionCookie.split('=')[1];
  return decodeSession(value);
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Server-side session reader for Next.js API Route Handlers.
 * Reads the `asw_session` cookie from the incoming request.
 * Do NOT use client-side — use `getSession()` in browser code instead.
 */
export function getServerSession(request: NextRequest): SessionData | null {
  try {
    const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!value) return null;
    const json = Buffer.from(value, 'base64').toString('utf-8');
    const parsed = JSON.parse(json) as SessionData;
    if (
      typeof parsed.id === 'string' &&
      (parsed.role === 'creator' || parsed.role === 'admin' || parsed.role === 'marketing')
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
