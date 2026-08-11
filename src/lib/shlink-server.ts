/**
 * Legacy Shlink helpers — prefer `@/lib/tinyurl-server` for new code.
 * Re-exports shared parse/ownership; keeps Shlink REST fetch for optional fallback.
 */

export {
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  parseShortlinkAlias,
  visitsFromShlinkShortUrlJson,
  type ShortlinkVisitStats as ShlinkVisitStats,
} from '@/lib/tinyurl-server';

import { getLegacyShortlinkPublicBaseUrl } from '@/lib/tinyurl-server';

const SHLINK_FETCH_TIMEOUT_MS = 12_000;

export function getShlinkBaseUrl(): string {
  return getLegacyShortlinkPublicBaseUrl();
}

export function getShlinkRestV3Root(): string {
  return `${getShlinkBaseUrl()}/rest/v3`;
}

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
