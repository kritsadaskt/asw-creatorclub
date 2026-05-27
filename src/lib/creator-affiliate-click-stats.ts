import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
  type ShlinkVisitStats,
} from '@/lib/shlink-server';

type LinkRow = { id: string; url: string | null };

const LIVE_CONCURRENCY = 8;

export type CreatorAffiliateClickStatsResult = {
  stats: Record<string, ShlinkVisitStats | null>;
  totalClicks: number;
  shlinkConfigured: boolean;
  statsSyncedAt: string | null;
};

export async function getCreatorAffiliateClickStats(
  creatorId: string,
): Promise<CreatorAffiliateClickStatsResult> {
  const apiKey = process.env.SHLINK_API_KEY;
  const shlinkConfigured = Boolean(apiKey);

  const { data, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url')
    .eq('creator_id', creatorId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as LinkRow[];
  const cacheMap = await getAffiliateLinkClickStatsByIds(rows.map((r) => r.id));

  const stats: Record<string, ShlinkVisitStats | null> = {};
  const liveTasks: { id: string; url: string }[] = [];

  for (const row of rows) {
    const url = row.url?.trim() ?? '';
    if (!url) {
      stats[row.id] = null;
      continue;
    }

    const parsed = parseShlinkShortCode(url);
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

    if (apiKey) {
      liveTasks.push({ id: row.id, url });
    } else {
      stats[row.id] = null;
    }
  }

  if (apiKey && liveTasks.length > 0) {
    await mapWithConcurrency(liveTasks, LIVE_CONCURRENCY, async (task) => {
      const parsed = parseShlinkShortCode(task.url);
      if (!parsed) return;
      const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
      if (!meta) return;
      const longUrl =
        typeof meta.longUrl === 'string'
          ? meta.longUrl
          : typeof meta.originalUrl === 'string'
            ? meta.originalUrl
            : '';
      if (!longUrlBelongsToCreator(longUrl, creatorId)) return;
      stats[task.id] = visitsFromShlinkShortUrlJson(meta);
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
    shlinkConfigured,
    statsSyncedAt,
  };
}
