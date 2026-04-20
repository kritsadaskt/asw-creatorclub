import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
  type ShlinkVisitStats,
} from '@/lib/shlink-server';

export type ShlinkStatsResponse = {
  stats: Record<string, ShlinkVisitStats | null>;
  /** Sum of `total` for non-null stats (convenience for UI). */
  totalClicksAll: number;
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.SHLINK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Shlink API key not configured' }, { status: 503 });
  }

  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creatorId = session.id;

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

    const stats: Record<string, ShlinkVisitStats | null> = {};
    const list = rows ?? [];

    await Promise.all(
      list.map(async (row: { id: string; url: string | null }) => {
        const id = row.id;
        const url = row.url?.trim() ?? '';
        if (!url) {
          stats[id] = null;
          return;
        }

        const parsed = parseShlinkShortCode(url);
        if (!parsed) {
          stats[id] = null;
          return;
        }

        const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
        if (!meta) {
          stats[id] = null;
          return;
        }

        const longUrl =
          typeof meta.longUrl === 'string'
            ? meta.longUrl
            : typeof meta.originalUrl === 'string'
              ? meta.originalUrl
              : '';
        if (!longUrlBelongsToCreator(longUrl, creatorId)) {
          stats[id] = null;
          return;
        }

        stats[id] = visitsFromShlinkShortUrlJson(meta);
      })
    );

    let totalClicksAll = 0;
    for (const v of Object.values(stats)) {
      if (v?.total != null && Number.isFinite(v.total)) {
        totalClicksAll += v.total;
      }
    }

    const body: ShlinkStatsResponse = { stats, totalClicksAll };
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
    return NextResponse.json({ error: 'Failed to load Shlink stats' }, { status: 500 });
  }
}
