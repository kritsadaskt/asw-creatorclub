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

type FetchShlinkVisitsOptions = {
  startDate?: string;
  endDate?: string;
  itemsPerPage?: number;
  maxPages?: number;
};

type ShlinkVisitEntry = {
  date: string;
};

/** Fetch visit entries from Shlink REST v3 short-url visits endpoint. */
export async function fetchShlinkShortUrlVisits(
  apiKey: string,
  shortCode: string,
  domain: string,
  options: FetchShlinkVisitsOptions = {}
): Promise<ShlinkVisitEntry[] | null> {
  const root = getShlinkRestV3Root();
  const itemsPerPage = options.itemsPerPage ?? 500;
  const maxPages = options.maxPages ?? 10;
  const paramsBase = new URLSearchParams({
    domain,
    itemsPerPage: String(itemsPerPage),
  });
  if (options.startDate) paramsBase.set('startDate', options.startDate);
  if (options.endDate) paramsBase.set('endDate', options.endDate);

  const all: ShlinkVisitEntry[] = [];
  let page = 1;
  let pagesCount = 1;

  while (page <= pagesCount && page <= maxPages) {
    const params = new URLSearchParams(paramsBase);
    params.set('page', String(page));
    const url = `${root}/short-urls/${encodeURIComponent(shortCode)}/visits?${params.toString()}`;

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
      const json = (await res.json()) as Record<string, unknown>;
      const visitsNode =
        json.visits && typeof json.visits === 'object'
          ? (json.visits as Record<string, unknown>)
          : json;
      const data = Array.isArray(visitsNode.data) ? visitsNode.data : [];
      const pagination =
        visitsNode.pagination && typeof visitsNode.pagination === 'object'
          ? (visitsNode.pagination as Record<string, unknown>)
          : {};
      const nextPagesCount =
        typeof pagination.pagesCount === 'number' && pagination.pagesCount > 0
          ? pagination.pagesCount
          : 1;
      pagesCount = nextPagesCount;

      for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const visit = item as Record<string, unknown>;
        if (typeof visit.date === 'string' && visit.date.trim()) {
          all.push({ date: visit.date });
        }
      }
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }

    page += 1;
  }

  return all;
}
