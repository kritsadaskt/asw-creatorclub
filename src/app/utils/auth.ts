export type SessionRole = 'creator' | 'admin';

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
      (parsed.role === 'creator' || parsed.role === 'admin')
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

