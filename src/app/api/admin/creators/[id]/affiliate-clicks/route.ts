import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
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
import { getServerSession } from '@/modules/utils/auth';

type RouteParams = { params: Promise<{ id: string }> };
type LinkRow = { id: string; url: string | null };

type AdminCreatorAffiliateClicksResponse = {
  stats: Record<string, ShlinkVisitStats | null>;
  shlinkConfigured: boolean;
  statsSyncedAt?: string | null;
};

const LIVE_CONCURRENCY = 8;

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: creatorId } = await params;
  if (!creatorId) {
    return NextResponse.json({ error: 'Missing creator id' }, { status: 400 });
  }

  const apiKey = process.env.SHLINK_API_KEY;
  const shlinkConfigured = Boolean(apiKey);

  try {
    const { data, error } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, url')
      .eq('creator_id', creatorId);

    if (error) {
      console.error('admin creator affiliate-clicks affiliate_links:', error);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/creators/[id]/affiliate-clicks',
        severity: 'error',
        message: error.message,
        context: requestLogContext(request),
      });
      return NextResponse.json({ error: 'Failed to load affiliate links' }, { status: 500 });
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

    const statsSyncedAt = maxSyncedAt(rows.map((r) => cacheMap.get(r.id)));

    const body: AdminCreatorAffiliateClicksResponse = {
      stats,
      shlinkConfigured,
      statsSyncedAt,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('admin creator affiliate-clicks error:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/affiliate-clicks',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to load click stats' }, { status: 500 });
  }
}
