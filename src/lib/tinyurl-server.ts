/**
 * Server-only TinyURL helpers (create, parse, stats).
 * Public short URLs: https://link.assetwise.co.th/{alias}
 * Legacy Shlink URLs still parsed: https://assetwise.co.th/c/{alias}
 */

const DEFAULT_TINYURL_DOMAIN = 'link.assetwise.co.th';
const DEFAULT_TINYURL_PUBLIC_BASE = 'https://link.assetwise.co.th';
const DEFAULT_LEGACY_PUBLIC_BASE = 'https://assetwise.co.th/c';
const DEFAULT_API_BASE = 'https://api.tinyurl.com';
const FETCH_TIMEOUT_MS = 12_000;

export type ShortlinkVisitStats = { total: number; nonBots?: number };
/** @deprecated Use ShortlinkVisitStats */
export type ShlinkVisitStats = ShortlinkVisitStats;

export function getTinyurlApiToken(): string | undefined {
  const t = process.env.TINY_URL_API_KEY?.trim() || process.env.TINYURL_API_TOKEN?.trim();
  return t || undefined;
}

export function getTinyurlDomain(): string {
  return (
    process.env.YOUR_TINYURL_DOMAIN?.trim() ||
    process.env.TINYURL_DOMAIN?.trim() ||
    DEFAULT_TINYURL_DOMAIN
  ).replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function getTinyurlApiBase(): string {
  const raw =
    process.env.TINYURL_OPENAPI_BASE_URL?.trim() ||
    (process.env.TINYURL_API_BASE_URL?.includes('api.tinyurl.com')
      ? process.env.TINYURL_API_BASE_URL.trim()
      : '') ||
    DEFAULT_API_BASE;
  return raw.replace(/\/+$/, '');
}

export function getTinyurlPublicBaseUrl(): string {
  const raw = process.env.TINYURL_PUBLIC_BASE_URL?.trim() || DEFAULT_TINYURL_PUBLIC_BASE;
  return raw.replace(/\/+$/, '');
}

export function getLegacyShortlinkPublicBaseUrl(): string {
  const raw =
    process.env.LEGACY_SHORTLINK_PUBLIC_BASE_URL?.trim() ||
    process.env.SHLINK_BASE_URL?.trim() ||
    DEFAULT_LEGACY_PUBLIC_BASE;
  return raw.replace(/\/+$/, '');
}

export function isTinyurlConfigured(): boolean {
  return Boolean(getTinyurlApiToken() && getTinyurlDomain());
}

/** Ownership check via destination query params (unchanged from Shlink era). */
export function longUrlBelongsToCreator(longUrl: string, creatorId: string): boolean {
  if (!creatorId) return false;
  try {
    const u = new URL(longUrl);
    const ref = u.searchParams.get('ref');
    const utmId = u.searchParams.get('utm_id');
    const utmContent = u.searchParams.get('utm_content');
    return ref === creatorId || utmId === creatorId || utmContent === creatorId;
  } catch {
    return false;
  }
}

function pathUnderBase(linkPath: string, basePath: string): string | null {
  const base = basePath.replace(/\/+$/, '') || '/';
  const path = linkPath.replace(/\/+$/, '') || '/';
  if (path === base) return '';
  if (path.startsWith(`${base}/`)) return path.slice(base.length + 1);
  return null;
}

/**
 * Parse stored short URL (TinyURL branded or legacy Shlink /c) into alias + TinyURL API domain.
 */
export function parseShortlinkAlias(linkUrl: string): { alias: string; domain: string } | null {
  const trimmed = linkUrl.trim();
  if (!trimmed) return null;

  let link: URL;
  try {
    link = new URL(trimmed);
  } catch {
    return null;
  }

  const tinyBase = new URL(getTinyurlPublicBaseUrl());
  const legacyBase = new URL(getLegacyShortlinkPublicBaseUrl());
  const apiDomain = getTinyurlDomain();

  if (link.protocol === tinyBase.protocol && link.host === tinyBase.host) {
    const under = pathUnderBase(link.pathname, tinyBase.pathname);
    if (under === null) return null;
    const alias = under.split('/')[0]?.trim();
    if (!alias) return null;
    return { alias, domain: apiDomain };
  }

  if (link.protocol === legacyBase.protocol && link.host === legacyBase.host) {
    const under = pathUnderBase(link.pathname, legacyBase.pathname);
    if (under === null) return null;
    const alias = under.split('/')[0]?.trim();
    if (!alias) return null;
    return { alias, domain: apiDomain };
  }

  return null;
}

/** @deprecated Use parseShortlinkAlias */
export function parseShlinkShortCode(linkUrl: string): { shortCode: string; domain: string } | null {
  const parsed = parseShortlinkAlias(linkUrl);
  if (!parsed) return null;
  return { shortCode: parsed.alias, domain: parsed.domain };
}

export function visitsFromTinyurlAliasJson(data: Record<string, unknown>): ShortlinkVisitStats | null {
  const node = (data.data && typeof data.data === 'object' ? data.data : data) as Record<
    string,
    unknown
  >;
  if (typeof node.hits === 'number' && Number.isFinite(node.hits)) {
    return { total: Math.trunc(node.hits) };
  }
  if (typeof node.total === 'number' && Number.isFinite(node.total)) {
    return { total: Math.trunc(node.total) };
  }
  return null;
}

/** Normalize Shlink short-url JSON (legacy live fallback). */
export function visitsFromShlinkShortUrlJson(data: Record<string, unknown>): ShortlinkVisitStats | null {
  const summary = data.visitsSummary as Record<string, unknown> | undefined;
  if (summary && typeof summary.total === 'number') {
    const nonBots = typeof summary.nonBots === 'number' ? summary.nonBots : undefined;
    return { total: summary.total, nonBots };
  }
  if (typeof data.visitCount === 'number') return { total: data.visitCount };
  if (typeof data.visits === 'number') return { total: data.visits };
  return null;
}

async function tinyurlFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = getTinyurlApiToken();
  if (!token) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${getTinyurlApiBase()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchTinyurlAliasMeta(
  alias: string,
  domain = getTinyurlDomain()
): Promise<Record<string, unknown> | null> {
  const res = await tinyurlFetch(`/alias/${encodeURIComponent(domain)}/${encodeURIComponent(alias)}`);
  if (!res?.ok) return null;
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type TinyurlDailyHit = { date: string; clicks: number };

/** Daily totals from TinyURL timeline analytics (YYYY-MM-DD). */
export async function fetchTinyurlTimelineDaily(
  alias: string,
  options: { from: string; to: string; domain?: string } = {
    from: '',
    to: '',
  }
): Promise<TinyurlDailyHit[] | null> {
  const domain = options.domain || getTinyurlDomain();
  if (!options.from || !options.to) return null;
  const params = new URLSearchParams({
    from: options.from.slice(0, 10),
    to: options.to.slice(0, 10),
    alias,
    domain,
  });
  const res = await tinyurlFetch(`/analytics/timeline?${params.toString()}`);
  if (!res?.ok) return null;
  try {
    const json = (await res.json()) as Record<string, unknown>;
    const data = json.data as Record<string, unknown> | undefined;
    const dataset = Array.isArray(data?.dataset) ? data!.dataset : [];
    const out: TinyurlDailyHit[] = [];
    for (const item of dataset) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const datetime = typeof row.datetime === 'string' ? row.datetime : '';
      const total = typeof row.total === 'number' ? row.total : 0;
      const date = datetime.slice(0, 10);
      if (!date) continue;
      out.push({ date, clicks: Math.max(0, Math.trunc(total)) });
    }
    return out;
  } catch {
    return null;
  }
}

export type CreateTinyurlResult =
  | { ok: true; shortUrl: string }
  | { ok: false; status: number; detail: string };

export async function createTinyurlShortUrl(params: {
  longUrl: string;
  tags?: string[];
  description?: string;
}): Promise<CreateTinyurlResult> {
  const token = getTinyurlApiToken();
  const domain = getTinyurlDomain();
  if (!token || !domain) {
    return { ok: false, status: 503, detail: 'TinyURL not configured' };
  }

  const tags = (params.tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length <= 45);

  const body: Record<string, unknown> = {
    url: params.longUrl,
    domain,
  };
  if (tags.length) body.tags = tags.join(',');
  if (params.description?.trim()) body.description = params.description.trim();

  const res = await tinyurlFetch('/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res) {
    return { ok: false, status: 502, detail: 'Failed to reach TinyURL' };
  }

  const text = await res.text().catch(() => '');
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    // Retry without tags if tag validation failed
    if (res.status === 422 && tags.length && /tag/i.test(text)) {
      return createTinyurlShortUrl({ ...params, tags: [] });
    }
    return { ok: false, status: res.status, detail: text.slice(0, 500) };
  }

  const data = (json?.data && typeof json.data === 'object' ? json.data : json) as Record<
    string,
    unknown
  > | null;
  const shortUrl =
    (typeof data?.tiny_url === 'string' && data.tiny_url) ||
    (typeof data?.tinyurl === 'string' && data.tinyurl) ||
    '';
  if (!shortUrl) {
    return { ok: false, status: 502, detail: 'TinyURL response missing tiny_url' };
  }
  return { ok: true, shortUrl };
}
