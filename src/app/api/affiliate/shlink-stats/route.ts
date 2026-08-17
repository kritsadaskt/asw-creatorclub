import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { mapWithConcurrency } from '@/lib/concurrency';
import { resolveAffiliateLinkClickTotals } from '@/lib/resolve-affiliate-link-clicks';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { isShlinkConfigured } from '@/lib/shlink-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  isTinyurlConfigured,
  parseShortlinkAlias,
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

export async function GET(request: NextRequest) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  const creatorId = auth.session.id;
  const configured = isTinyurlConfigured() || isShlinkConfigured();

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

    const list = (rows ?? []) as { id: string; url: string | null }[];
    const ids = list.map((r) => r.id);
    const cacheMap = await getAffiliateLinkClickStatsByIds(ids);

    const stats: Record<string, ShortlinkVisitStats | null> = {};

    if (configured) {
      await mapWithConcurrency(list, LIVE_CONCURRENCY, async (row) => {
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
        stats[row.id] = resolved?.stats ?? rowToVisitStats(cacheMap.get(row.id));
      });
    } else {
      for (const row of list) {
        stats[row.id] = rowToVisitStats(cacheMap.get(row.id));
      }
    }

    let totalClicksAll = 0;
    for (const v of Object.values(stats)) {
      if (v?.total != null && Number.isFinite(v.total)) {
        totalClicksAll += v.total;
      }
    }

    const refreshed = await getAffiliateLinkClickStatsByIds(ids);
    const statsSyncedAt = maxSyncedAt(ids.map((i) => refreshed.get(i) ?? cacheMap.get(i)));

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
