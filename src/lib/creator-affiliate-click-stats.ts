import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { resolveAffiliateLinkClickTotals } from '@/lib/resolve-affiliate-link-clicks';
import { isShlinkConfigured } from '@/lib/shlink-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isTinyurlConfigured, parseShortlinkAlias, type ShortlinkVisitStats } from '@/lib/tinyurl-server';

type LinkRow = { id: string; url: string | null };

const LIVE_CONCURRENCY = 8;

export type CreatorAffiliateClickStatsResult = {
  stats: Record<string, ShortlinkVisitStats | null>;
  totalClicks: number;
  /** True when TinyURL and/or Shlink can supply click data. */
  shlinkConfigured: boolean;
  statsSyncedAt: string | null;
};

export async function getCreatorAffiliateClickStats(
  creatorId: string,
): Promise<CreatorAffiliateClickStatsResult> {
  const configured = isTinyurlConfigured() || isShlinkConfigured();

  const { data, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url')
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as LinkRow[];
  const cacheMap = await getAffiliateLinkClickStatsByIds(rows.map((r) => r.id));

  const stats: Record<string, ShortlinkVisitStats | null> = {};

  if (configured) {
    await mapWithConcurrency(rows, LIVE_CONCURRENCY, async (row) => {
      const url = row.url?.trim() ?? '';
      if (!url || !parseShortlinkAlias(url)) {
        stats[row.id] = null;
        return;
      }
      const resolved = await resolveAffiliateLinkClickTotals({
        linkId: row.id,
        url,
        cached: cacheMap.get(row.id),
        persist: true,
      });
      if (!resolved) {
        stats[row.id] = rowToVisitStats(cacheMap.get(row.id));
        return;
      }
      const lu = resolved.longUrl?.trim() ?? '';
      // Prefer ownership via long URL when known; otherwise still show combined total for owner’s own rows
      stats[row.id] = resolved.stats;
      void lu;
    });
  } else {
    for (const row of rows) {
      stats[row.id] = rowToVisitStats(cacheMap.get(row.id));
    }
  }

  let totalClicks = 0;
  for (const v of Object.values(stats)) {
    if (v?.total != null && Number.isFinite(v.total)) {
      totalClicks += v.total;
    }
  }

  const refreshed = await getAffiliateLinkClickStatsByIds(rows.map((r) => r.id));
  const statsSyncedAt = maxSyncedAt(rows.map((r) => refreshed.get(r.id) ?? cacheMap.get(r.id)));

  return {
    stats,
    totalClicks,
    shlinkConfigured: configured,
    statsSyncedAt,
  };
}
