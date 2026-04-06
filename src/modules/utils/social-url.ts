import type { CreatorProfile } from '../types';

export type SocialPlatform = keyof CreatorProfile['socialAccounts'];

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'lemon8',
];

/** Hostnames that must not be turned into /hostname profile paths when user omits slashes. */
const BARE_HOSTS_BY_PLATFORM: Record<SocialPlatform, readonly string[]> = {
  facebook: [
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
    'mobile.facebook.com',
    'web.facebook.com',
    'l.facebook.com',
    'lm.facebook.com',
    'fb.com',
    'www.fb.com',
    'fb.me',
    'www.fb.me',
    'fb.watch',
    'www.fb.watch',
  ],
  instagram: ['instagram.com', 'www.instagram.com', 'm.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'www.vm.tiktok.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'],
  twitter: ['twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'x.com', 'www.x.com'],
  lemon8: ['lemon8.com', 'www.lemon8.com'],
};

const SLUG_ONLY_RE = /^[A-Za-z0-9@_.-]+$/;

function hostAllowed(host: string, platform: SocialPlatform): boolean {
  const h = host.toLowerCase();
  switch (platform) {
    case 'facebook':
      return (
        h === 'facebook.com' ||
        h.endsWith('.facebook.com') ||
        h === 'fb.com' ||
        h.endsWith('.fb.com') ||
        h === 'fb.me' ||
        h.endsWith('.fb.me') ||
        h === 'fb.watch' ||
        h.endsWith('.fb.watch')
      );
    case 'instagram':
      return h === 'instagram.com' || h.endsWith('.instagram.com');
    case 'tiktok':
      return h === 'tiktok.com' || h.endsWith('.tiktok.com');
    case 'youtube':
      return h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be';
    case 'twitter':
      return (
        h === 'twitter.com' ||
        h.endsWith('.twitter.com') ||
        h === 'x.com' ||
        h.endsWith('.x.com')
      );
    case 'lemon8':
      return h === 'lemon8.com' || h.endsWith('.lemon8.com');
  }
}

function isBarePlatformHostname(trimmed: string, platform: SocialPlatform): boolean {
  const h = trimmed.toLowerCase();
  return BARE_HOSTS_BY_PLATFORM[platform].some((x) => x === h);
}

const TRACKING_PARAM_NAMES = new Set([
  'fbclid',
  'igshid',
  '_ga',
  'si',
  'feature',
  'source',
]);

function stripTrackingSearchParams(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_PARAM_NAMES.has(lower)) {
      url.searchParams.delete(key);
    }
  }
}

function hasMeaningfulResource(url: URL): boolean {
  const pathNoSlash = url.pathname.replace(/\//g, '');
  if (pathNoSlash.length > 0) return true;
  return url.searchParams.toString().length > 0;
}

/** Ensures a parseable absolute URL string (adds https:// when scheme is missing). */
export function withHttpsScheme(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `https://${t}`;
}

function normalizeFromAbsoluteInput(platform: SocialPlatform, trimmed: string): string | undefined {
  const toParse = withHttpsScheme(trimmed);

  let url: URL;
  try {
    url = new URL(toParse);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return undefined;
  }

  url.protocol = 'https:';

  if (!hostAllowed(url.hostname, platform)) {
    return undefined;
  }

  stripTrackingSearchParams(url);

  if (!hasMeaningfulResource(url)) {
    return undefined;
  }

  return url.toString();
}

function buildProfileUrlFromSlug(platform: SocialPlatform, slug: string): string {
  const noAt = slug.replace(/^@+/, '');
  switch (platform) {
    case 'facebook':
      return `https://facebook.com/${encodeURIComponent(slug).replace(/%40/g, '@')}`;
    case 'instagram':
      return `https://www.instagram.com/${encodeURIComponent(noAt)}/`;
    case 'tiktok':
      return `https://www.tiktok.com/@${encodeURIComponent(noAt)}`;
    case 'youtube':
      return `https://www.youtube.com/${encodeURIComponent(noAt)}`;
    case 'twitter':
      return `https://x.com/${encodeURIComponent(noAt)}`;
    case 'lemon8':
      return `https://www.lemon8.com/${encodeURIComponent(noAt)}`;
  }
}

/**
 * Normalizes and validates a single social profile URL for persistence and safe href use.
 * Accepts full URLs, domain paths without scheme, or a bare handle (no `/`) per platform.
 */
export function sanitizeSocialUrl(
  platform: SocialPlatform,
  raw: string | null | undefined,
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const direct = normalizeFromAbsoluteInput(platform, trimmed);
  if (direct) return direct;

  if (
    trimmed.includes('/') ||
    trimmed.includes(':') ||
    /\s/.test(trimmed) ||
    !SLUG_ONLY_RE.test(trimmed)
  ) {
    return undefined;
  }

  if (isBarePlatformHostname(trimmed, platform)) {
    return undefined;
  }

  if (!trimmed.replace(/^@+/, '')) {
    return undefined;
  }

  const synthesized = buildProfileUrlFromSlug(platform, trimmed);
  return normalizeFromAbsoluteInput(platform, synthesized);
}

export type SocialAccountsInput = Partial<Record<SocialPlatform, string | null | undefined>>;

export function sanitizeSocialAccounts(accounts: SocialAccountsInput | null | undefined): CreatorProfile['socialAccounts'] {
  if (!accounts || typeof accounts !== 'object') return {};
  const out: CreatorProfile['socialAccounts'] = {};
  for (const key of SOCIAL_PLATFORMS) {
    const v = accounts[key];
    const str = typeof v === 'string' ? v : v == null ? undefined : String(v);
    const sanitized = sanitizeSocialUrl(key, str);
    if (sanitized) {
      out[key] = sanitized;
    }
  }
  return out;
}

/** Empty field is valid (optional). Non-empty must sanitize successfully. */
export function isValidSocialUrlForPlatform(platform: SocialPlatform, raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return true;
  return sanitizeSocialUrl(platform, raw) !== undefined;
}

export const SOCIAL_URL_INPUT_TITLES: Record<SocialPlatform, string> = {
  facebook:
    'ใส่ลิงก์โปรไฟล์ หรือ username อย่างเดียวก็ได้ (เช่น foo, facebook.com/foo, fb.com/foo) — ระบบจะจัดรูปแบบตอนบันทึก',
  instagram: 'ใส่ลิงก์ หรือ @username / username อย่างเดียวก็ได้',
  tiktok: 'ใส่ลิงก์ หรือ @username / username อย่างเดียวก็ได้',
  youtube: 'ใส่ลิงก์เต็มได้ หรือ handle/ช่อง (ฝากลิงก์ที่มี @ หรือ /channel/ แนะนำให้วางลิงก์เต็ม)',
  twitter: 'ใส่ลิงก์ หรือ @username / username อย่างเดียวก็ได้',
  lemon8: 'ใส่ลิงก์ หรือ username อย่างเดียวก็ได้',
};
