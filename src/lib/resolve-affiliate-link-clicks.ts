import {
  combineAffiliateClickTotals,
  raiseShlinkBaseline,
} from '@/lib/affiliate-click-totals';
import type { AffiliateLinkClickStatRow } from '@/lib/affiliate-link-click-cache';
import { fetchShlinkVisitTotal, isShlinkConfigured } from '@/lib/shlink-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlHits,
  isTinyurlConfigured,
  parseShortlinkAlias,
  type ShortlinkVisitStats,
} from '@/lib/tinyurl-server';

function baselineFromCache(cached: AffiliateLinkClickStatRow | undefined): number {
  if (!cached) return 0;
  if (cached.shlink_baseline != null && Number.isFinite(cached.shlink_baseline)) {
    return Math.max(0, Math.trunc(cached.shlink_baseline));
  }
  // Pre-migration rows: total_visits was Shlink-only
  if (cached.total_visits != null && Number.isFinite(cached.total_visits)) {
    return Math.max(0, Math.trunc(cached.total_visits));
  }
  return 0;
}

function tinyHitsFromCache(cached: AffiliateLinkClickStatRow | undefined): number {
  if (!cached) return 0;
  if (cached.tinyurl_hits != null && Number.isFinite(cached.tinyurl_hits)) {
    return Math.max(0, Math.trunc(cached.tinyurl_hits));
  }
  return 0;
}

export type ResolvedAffiliateClickStats = {
  stats: ShortlinkVisitStats;
  longUrl: string | null;
  shlinkBaseline: number;
  tinyurlHits: number;
};

async function persistClickStats(row: {
  affiliate_link_id: string;
  shlink_baseline: number;
  tinyurl_hits: number;
  total_visits: number;
  long_url: string | null;
  synced_at: string;
}): Promise<void> {
  const full = await supabaseAdmin.from('affiliate_link_click_stats').upsert(
    {
      ...row,
      non_bot_visits: null,
    },
    { onConflict: 'affiliate_link_id' },
  );
  if (!full.error) return;

  // Columns from migration 024 may be missing — still persist display total.
  console.warn('affiliate click persist (full) failed:', full.error.message);
  const fallback = await supabaseAdmin.from('affiliate_link_click_stats').upsert(
    {
      affiliate_link_id: row.affiliate_link_id,
      total_visits: row.total_visits,
      long_url: row.long_url,
      synced_at: row.synced_at,
    },
    { onConflict: 'affiliate_link_id' },
  );
  if (fallback.error) {
    console.warn('affiliate click persist (fallback) failed:', fallback.error.message);
  }
}

/**
 * Live resolve: shlink_baseline (+ optional live Shlink raise) + TinyURL hits.
 * Optionally persists the combined row so dashboard stays fresh without waiting for cron.
 */
export async function resolveAffiliateLinkClickTotals(params: {
  linkId: string;
  url: string;
  cached?: AffiliateLinkClickStatRow;
  persist?: boolean;
}): Promise<ResolvedAffiliateClickStats | null> {
  const parsed = parseShortlinkAlias(params.url);
  if (!parsed) return null;

  let shlinkBaseline = baselineFromCache(params.cached);
  let tinyurlHits = tinyHitsFromCache(params.cached);
  let longUrl = params.cached?.long_url?.trim() || null;

  if (isShlinkConfigured()) {
    const liveShlink = await fetchShlinkVisitTotal(parsed.alias);
    shlinkBaseline = raiseShlinkBaseline(shlinkBaseline, liveShlink);
  }

  if (isTinyurlConfigured()) {
    const tiny = await fetchTinyurlHits(parsed.alias, parsed.domain);
    if (tiny.hits != null) tinyurlHits = tiny.hits;
    if (tiny.longUrl) longUrl = tiny.longUrl;
  }

  const total = combineAffiliateClickTotals(shlinkBaseline, tinyurlHits);
  const stats: ShortlinkVisitStats = { total, shlinkBaseline, tinyurlHits };

  if (params.persist) {
    await persistClickStats({
      affiliate_link_id: params.linkId,
      shlink_baseline: shlinkBaseline,
      tinyurl_hits: tinyurlHits,
      total_visits: total,
      long_url: longUrl,
      synced_at: new Date().toISOString(),
    });
  }

  return { stats, longUrl, shlinkBaseline, tinyurlHits };
}
