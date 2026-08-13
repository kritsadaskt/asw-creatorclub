import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlAliasMeta,
  isTinyurlConfigured,
  longUrlBelongsToCreator,
  parseShortlinkAlias,
  visitsFromTinyurlAliasJson,
  type ShortlinkVisitStats,
} from '@/lib/tinyurl-server';

export type ShlinkStatsResponse = {
  stats: Record<string, ShortlinkVisitStats | null>;
  /** Sum of `total` for non-null stats (convenience for UI). */
  totalClicksAll: number;
  /** Latest cache sync (UTC ISO) when reading from `affiliate_link_click_stats`. */
  statsSyncedAt?: string | null;
};

const LIVE_CONCURRENCY = 8;

function longUrlFromTinyMeta(meta: Record<string, unknown>): string {
  const data = (meta.data && typeof meta.data === 'object' ? meta.data : meta) as Record<
    string,
    unknown
  >;
  if (typeof data.url === 'string') return data.url;
  return '';
}

export async function GET(request: NextRequest) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  const creatorId = auth.session.id;
  const configured = isTinyurlConfigured();

  try {
    const { data: rows, error } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, url')
      .eq('creator_id', creatorId);

    if (error) {
      console.error('shlink-stats affiliate_links:', error);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:affiliate/shlink-stats',
        severity: 'error',
        message: error.message,
        context: requestLogContext(request),
      });
      return NextResponse.json({ error: 'Failed to load links' }, { status: 500 });
    }

    const list = rows ?? [];
    const ids = list.map((r: { id: string }) => r.id);
    const cacheMap = await getAffiliateLinkClickStatsByIds(ids);

    const stats: Record<string, ShortlinkVisitStats | null> = {};
    type Task = { id: string; url: string };
    const liveTasks: Task[] = [];

    for (const row of list as { id: string; url: string | null }[]) {
      const id = row.id;
      const url = row.url?.trim() ?? '';
      if (!url) {
        stats[id] = null;
        continue;
      }

      const parsed = parseShortlinkAlias(url);
      if (!parsed) {
        stats[id] = null;
        continue;
      }

      const cached = cacheMap.get(id);
      if (cached && cached.total_visits != null && Number.isFinite(cached.total_visits)) {
        const lu = cached.long_url?.trim() ?? '';
        if (lu && longUrlBelongsToCreator(lu, creatorId)) {
          stats[id] = rowToVisitStats(cached);
          continue;
        }
      }

      if (configured) {
        liveTasks.push({ id, url });
      } else {
        stats[id] = null;
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

    let totalClicksAll = 0;
    for (const v of Object.values(stats)) {
      if (v?.total != null && Number.isFinite(v.total)) {
        totalClicksAll += v.total;
      }
    }

    const statsSyncedAt = maxSyncedAt(ids.map((i) => cacheMap.get(i)));

    const body: ShlinkStatsResponse = { stats, totalClicksAll, statsSyncedAt };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('shlink-stats error:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/shlink-stats',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to load shortlink stats' }, { status: 500 });
  }
}
