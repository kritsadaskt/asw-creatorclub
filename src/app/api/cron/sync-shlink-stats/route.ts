import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { syncAffiliateLinkShortlinkStatsFromTinyurl } from '@/lib/sync-affiliate-link-shlink-stats';
import { isTinyurlConfigured } from '@/lib/tinyurl-server';

/**
 * Vercel Cron (GET). When `CRON_SECRET` is set, Vercel sends `Authorization: Bearer <CRON_SECRET>`.
 * Schedule in `vercel.json`: 17:00 UTC daily ≈ 00:00 Asia/Bangkok.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization') ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTinyurlConfigured()) {
    return NextResponse.json({ error: 'TinyURL not configured' }, { status: 503 });
  }

  try {
    const result = await syncAffiliateLinkShortlinkStatsFromTinyurl();
    return NextResponse.json({ ok: true, provider: 'tinyurl', ...result }, { status: 200 });
  } catch (err) {
    console.error('cron sync-shlink-stats:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:cron/sync-shlink-stats',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
