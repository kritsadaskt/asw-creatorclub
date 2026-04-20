/**
 * Server-only Shlink helpers (base URL, parsing). Used by affiliate shorten + stats API routes.
 */

const DEFAULT_SHLINK_BASE_URL = 'https://assetwise.co.th/c';

export function getShlinkBaseUrl(): string {
  const raw = process.env.SHLINK_BASE_URL?.trim() || DEFAULT_SHLINK_BASE_URL;
  return raw.replace(/\/+$/, '');
}

export function getShlinkRestV3Root(): string {
  return `${getShlinkBaseUrl()}/rest/v3`;
}

/**
 * If `linkUrl` is under the configured public Shlink base, returns short code and API domain.
 */
export function parseShlinkShortCode(linkUrl: string): { shortCode: string; domain: string } | null {
  const trimmed = linkUrl.trim();
  if (!trimmed) return null;

  let link: URL;
  try {
    link = new URL(trimmed);
  } catch {
    return null;
  }

  const base = new URL(getShlinkBaseUrl());
  if (link.protocol !== base.protocol || link.host !== base.host) {
    return null;
  }

  const basePath = base.pathname.replace(/\/+$/, '') || '/';
  const path = link.pathname.replace(/\/+$/, '') || '/';
  const underBase =
    path === basePath ? '' : path.startsWith(`${basePath}/`) ? path.slice(basePath.length + 1) : null;
  if (underBase === null) return null;

  const shortCode = underBase.split('/')[0]?.trim();
  if (!shortCode) return null;

  return { shortCode, domain: link.hostname };
}

export function longUrlBelongsToCreator(longUrl: string, creatorId: string): boolean {
  if (!creatorId) return false;
  try {
    const u = new URL(longUrl);
    const ref = u.searchParams.get('ref');
    const utmId = u.searchParams.get('utm_id');
    return ref === creatorId || utmId === creatorId;
  } catch {
    return false;
  }
}

export type ShlinkVisitStats = { total: number; nonBots?: number };

/** Normalize Shlink short-url JSON into visit totals (handles version differences). */
export function visitsFromShlinkShortUrlJson(data: Record<string, unknown>): ShlinkVisitStats | null {
  const summary = data.visitsSummary as Record<string, unknown> | undefined;
  if (summary && typeof summary.total === 'number') {
    const nonBots = typeof summary.nonBots === 'number' ? summary.nonBots : undefined;
    return { total: summary.total, nonBots };
  }
  if (typeof data.visitCount === 'number') {
    return { total: data.visitCount };
  }
  if (typeof data.visits === 'number') {
    return { total: data.visits };
  }
  return null;
}

const SHLINK_FETCH_TIMEOUT_MS = 12_000;

/** GET short-url metadata from Shlink REST v3 (server-side only). */
export async function fetchShlinkShortUrlMeta(
  apiKey: string,
  shortCode: string,
  domain: string
): Promise<Record<string, unknown> | null> {
  const root = getShlinkRestV3Root();
  const url = `${root}/short-urls/${encodeURIComponent(shortCode)}?domain=${encodeURIComponent(domain)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SHLINK_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Api-Key': apiKey,
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
