import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
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
};

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
  if (!apiKey) {
    const body: AdminCreatorAffiliateClicksResponse = { stats: {}, shlinkConfigured: false };
    return NextResponse.json(body, { status: 200 });
  }

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
    const stats: Record<string, ShlinkVisitStats | null> = {};

    await Promise.all(
      rows.map(async (row) => {
        const url = row.url?.trim() ?? '';
        if (!url) {
          stats[row.id] = null;
          return;
        }

        const parsed = parseShlinkShortCode(url);
        if (!parsed) {
          stats[row.id] = null;
          return;
        }

        const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
        if (!meta) {
          stats[row.id] = null;
          return;
        }

        const longUrl =
          typeof meta.longUrl === 'string'
            ? meta.longUrl
            : typeof meta.originalUrl === 'string'
              ? meta.originalUrl
              : '';

        if (!longUrlBelongsToCreator(longUrl, creatorId)) {
          stats[row.id] = null;
          return;
        }

        stats[row.id] = visitsFromShlinkShortUrlJson(meta);
      }),
    );

    const body: AdminCreatorAffiliateClicksResponse = { stats, shlinkConfigured: true };
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
