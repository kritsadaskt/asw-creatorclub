import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlAliasMeta,
  isTinyurlConfigured,
  longUrlBelongsToCreator,
  parseShortlinkAlias,
  visitsFromTinyurlAliasJson,
  type ShortlinkVisitStats,
} from '@/lib/tinyurl-server';

type LinkRow = { id: string; url: string | null };

const LIVE_CONCURRENCY = 8;

export type CreatorAffiliateClickStatsResult = {
  stats: Record<string, ShortlinkVisitStats | null>;
  totalClicks: number;
  /** True when TinyURL (or legacy flag name) is configured for live fallback. */
  shlinkConfigured: boolean;
  statsSyncedAt: string | null;
};

function longUrlFromTinyMeta(meta: Record<string, unknown>): string {
  const data = (meta.data && typeof meta.data === 'object' ? meta.data : meta) as Record<
    string,
    unknown
  >;
  if (typeof data.url === 'string') return data.url;
  return '';
}

export async function getCreatorAffiliateClickStats(
  creatorId: string,
): Promise<CreatorAffiliateClickStatsResult> {
  const configured = isTinyurlConfigured();

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
  const liveTasks: { id: string; url: string }[] = [];

  for (const row of rows) {
    const url = row.url?.trim() ?? '';
    if (!url) {
      stats[row.id] = null;
      continue;
    }

    const parsed = parseShortlinkAlias(url);
    if (!parsed) {
      stats[row.id] = null;
      continue;
    }

    const cached = cacheMap.get(row.id);
    if (cached && cached.total_visits != null && Number.isFinite(cached.total_visits)) {
      const lu = cached.long_url?.trim() ?? '';
      if (lu && longUrlBelongsToCreator(lu, creatorId)) {
        stats[row.id] = rowToVisitStats(cached);
        continue;
      }
    }

    if (configured) {
      liveTasks.push({ id: row.id, url });
    } else {
      stats[row.id] = null;
    }
  }

  if (configured && liveTasks.length > 0) {
    await mapWithConcurrency(liveTasks, LIVE_CONCURRENCY, async (task) => {
      const parsed = parseShortlinkAlias(task.url);
      if (!parsed) return;
      const meta = await fetchTinyurlAliasMeta(parsed.alias, parsed.domain);
      if (!meta) return;
      const longUrl = longUrlFromTinyMeta(meta);
      if (!longUrlBelongsToCreator(longUrl, creatorId)) return;
      stats[task.id] = visitsFromTinyurlAliasJson(meta);
    });
  }

  let totalClicks = 0;
  for (const v of Object.values(stats)) {
    if (v?.total != null && Number.isFinite(v.total)) {
      totalClicks += v.total;
    }
  }

  const statsSyncedAt = maxSyncedAt(rows.map((r) => cacheMap.get(r.id)));

  return {
    stats,
    totalClicks,
    shlinkConfigured: configured,
    statsSyncedAt,
  };
}
