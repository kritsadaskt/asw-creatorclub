import { combineAffiliateClickTotals } from '@/lib/affiliate-click-totals';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { ShlinkVisitStats } from '@/lib/shlink-server';

export type AffiliateLinkClickStatRow = {
  affiliate_link_id: string;
  total_visits: number | null;
  /** Pre-cutover / live Shlink total (additive with tinyurl_hits). */
  shlink_baseline: number | null;
  /** TinyURL alias hits since seed. */
  tinyurl_hits: number | null;
  non_bot_visits: number | null;
  /** Long URL from provider at sync time (for `longUrlBelongsToCreator` checks). */
  long_url: string | null;
  synced_at: string;
};

export type AffiliateLinkDailyClickRow = {
  affiliate_link_id: string;
  click_date: string;
  clicks: number;
  synced_at: string;
};

/**
 * Keep each `.in()` filter well under Node's header limit.
 * One request with every affiliate link id overflows (`UND_ERR_HEADERS_OVERFLOW`)
 * and the dashboard report then treats the whole cache as empty.
 */
const CLICK_STATS_ID_CHUNK = 100;

const CLICK_STATS_COLUMNS_FULL =
  'affiliate_link_id, total_visits, shlink_baseline, tinyurl_hits, non_bot_visits, long_url, synced_at';
const CLICK_STATS_COLUMNS_LEGACY =
  'affiliate_link_id, total_visits, non_bot_visits, long_url, synced_at';

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

/** Load cached click aggregates for the given affiliate link ids. */
export async function getAffiliateLinkClickStatsByIds(
  linkIds: string[],
): Promise<Map<string, AffiliateLinkClickStatRow>> {
  const map = new Map<string, AffiliateLinkClickStatRow>();
  const uniqueIds = [...new Set(linkIds.filter((id) => id.trim().length > 0))];
  if (uniqueIds.length === 0) return map;

  let useLegacyColumns = false;

  for (const chunk of chunkIds(uniqueIds, CLICK_STATS_ID_CHUNK)) {
    if (!useLegacyColumns) {
      const { data, error } = await supabaseAdmin
        .from('affiliate_link_click_stats')
        .select(CLICK_STATS_COLUMNS_FULL)
        .in('affiliate_link_id', chunk);

      if (!error) {
        for (const row of data ?? []) {
          const r = row as AffiliateLinkClickStatRow;
          map.set(r.affiliate_link_id, r);
        }
        continue;
      }

      console.warn('affiliate_link_click_stats select (with baseline cols):', error.message);
      useLegacyColumns = true;
    }

    const fallback = await supabaseAdmin
      .from('affiliate_link_click_stats')
      .select(CLICK_STATS_COLUMNS_LEGACY)
      .in('affiliate_link_id', chunk);
    if (fallback.error) {
      console.error('affiliate_link_click_stats select:', fallback.error);
      continue;
    }
    for (const row of fallback.data ?? []) {
      const r = row as AffiliateLinkClickStatRow;
      map.set(r.affiliate_link_id, {
        ...r,
        shlink_baseline: r.total_visits,
        tinyurl_hits: 0,
      });
    }
  }

  return map;
}

export function rowToVisitStats(row: AffiliateLinkClickStatRow | undefined): ShlinkVisitStats | null {
  if (!row) return null;
  const hasParts = row.shlink_baseline != null || row.tinyurl_hits != null;
  if (hasParts) {
    const shlinkBaseline =
      row.shlink_baseline != null && Number.isFinite(row.shlink_baseline)
        ? Math.max(0, Math.trunc(row.shlink_baseline))
        : 0;
    const tinyurlHits =
      row.tinyurl_hits != null && Number.isFinite(row.tinyurl_hits)
        ? Math.max(0, Math.trunc(row.tinyurl_hits))
        : 0;
    const combined = combineAffiliateClickTotals(shlinkBaseline, tinyurlHits);
    const total =
      combined > 0
        ? combined
        : row.total_visits != null && Number.isFinite(row.total_visits)
          ? Math.trunc(row.total_visits)
          : combined;
    const nonBots =
      row.non_bot_visits != null && Number.isFinite(row.non_bot_visits)
        ? row.non_bot_visits
        : undefined;
    return { total, shlinkBaseline, tinyurlHits, ...(nonBots !== undefined ? { nonBots } : {}) };
  }
  if (row.total_visits == null || !Number.isFinite(row.total_visits)) return null;
  const total = row.total_visits;
  const nonBots =
    row.non_bot_visits != null && Number.isFinite(row.non_bot_visits) ? row.non_bot_visits : undefined;
  return { total, ...(nonBots !== undefined ? { nonBots: nonBots } : {}) };
}

/** Latest `synced_at` among the given rows (ISO string), or null if none. */
export function maxSyncedAt(rows: Iterable<AffiliateLinkClickStatRow | undefined>): string | null {
  let best: string | null = null;
  for (const r of rows) {
    if (!r?.synced_at) continue;
    if (!best || r.synced_at > best) best = r.synced_at;
  }
  return best;
}

export async function getAffiliateLinkDailyClicksInRange(
  linkId: string,
  startDateIso: string,
  endDateIso: string,
): Promise<Map<string, number>> {
  const perDay = new Map<string, number>();
  const { data, error } = await supabaseAdmin
    .from('affiliate_link_daily_clicks')
    .select('click_date, clicks')
    .eq('affiliate_link_id', linkId)
    .gte('click_date', startDateIso.slice(0, 10))
    .lte('click_date', endDateIso.slice(0, 10));

  if (error) {
    console.error('affiliate_link_daily_clicks select:', error);
    return perDay;
  }

  for (const row of data ?? []) {
    const r = row as { click_date: string; clicks: number | null };
    const d = (r.click_date ?? '').slice(0, 10);
    if (!d) continue;
    const c = r.clicks ?? 0;
    perDay.set(d, (perDay.get(d) ?? 0) + c);
  }
  return perDay;
}
