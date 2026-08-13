import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateLinkDailyClicksInRange } from '@/lib/affiliate-link-click-cache';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlAliasMeta,
  fetchTinyurlTimelineDaily,
  isTinyurlConfigured,
  longUrlBelongsToCreator,
  parseShortlinkAlias,
} from '@/lib/tinyurl-server';

type DailyPoint = {
  date: string;
  clicks: number;
};

type ClickSeriesResponse = {
  days: number;
  points: DailyPoint[];
  totals: {
    days3: number;
    days7: number;
    days30: number;
  };
  statsSyncedAt?: string | null;
};

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildPointsFromDailyMap(
  today: Date,
  days: number,
  perDayMap: Map<string, number>,
): DailyPoint[] {
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKey(d);
    points.push({ date: key, clicks: perDayMap.get(key) ?? 0 });
  }
  return points;
}

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
  const linkId = request.nextUrl.searchParams.get('linkId')?.trim();
  const daysParam = Number(request.nextUrl.searchParams.get('days') || '30');
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(Math.trunc(daysParam), 3), 30) : 30;

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url')
    .eq('id', linkId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to load affiliate link' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Affiliate link not found' }, { status: 404 });
  }

  const url = row.url?.trim() ?? '';
  const parsed = parseShortlinkAlias(url);
  if (!parsed) {
    const empty: ClickSeriesResponse = {
      days,
      points: [],
      totals: { days3: 0, days7: 0, days30: 0 },
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));
  const startDateIso = startDate.toISOString();
  const endDateIso = today.toISOString();

  const { data: statRow } = await supabaseAdmin
    .from('affiliate_link_click_stats')
    .select('synced_at, long_url')
    .eq('affiliate_link_id', linkId)
    .maybeSingle();

  const cachedLong = typeof statRow?.long_url === 'string' ? statRow.long_url.trim() : '';
  const canUseCacheChart =
    Boolean(statRow?.synced_at) && Boolean(cachedLong) && longUrlBelongsToCreator(cachedLong, creatorId);

  if (canUseCacheChart) {
    const perDayMap = await getAffiliateLinkDailyClicksInRange(linkId, startDateIso, endDateIso);
    const points = buildPointsFromDailyMap(today, days, perDayMap);
    const sumLast = (n: number) => points.slice(-n).reduce((sum, p) => sum + p.clicks, 0);
    const body: ClickSeriesResponse = {
      days,
      points,
      totals: {
        days3: sumLast(3),
        days7: sumLast(7),
        days30: sumLast(30),
      },
      statsSyncedAt: statRow?.synced_at ?? null,
    };
    return NextResponse.json(body, { status: 200 });
  }

  if (!isTinyurlConfigured()) {
    const empty: ClickSeriesResponse = {
      days,
      points: [],
      totals: { days3: 0, days7: 0, days30: 0 },
      statsSyncedAt: statRow?.synced_at ?? null,
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const meta = await fetchTinyurlAliasMeta(parsed.alias, parsed.domain);
  if (!meta) {
    const empty: ClickSeriesResponse = {
      days,
      points: [],
      totals: { days3: 0, days7: 0, days30: 0 },
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const longUrl = longUrlFromTinyMeta(meta);
  if (!longUrlBelongsToCreator(longUrl, creatorId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const timeline = await fetchTinyurlTimelineDaily(parsed.alias, {
    from: startDateIso,
    to: endDateIso,
    domain: parsed.domain,
  });

  if (!timeline) {
    return NextResponse.json({ error: 'Failed to load click visits' }, { status: 500 });
  }

  const perDayMap = new Map<string, number>();
  for (const hit of timeline) {
    perDayMap.set(hit.date, (perDayMap.get(hit.date) ?? 0) + hit.clicks);
  }

  const points = buildPointsFromDailyMap(today, days, perDayMap);
  const sumLast = (n: number) => points.slice(-n).reduce((sum, p) => sum + p.clicks, 0);
  const body: ClickSeriesResponse = {
    days,
    points,
    totals: {
      days3: sumLast(3),
      days7: sumLast(7),
      days30: sumLast(30),
    },
  };
  return NextResponse.json(body, { status: 200 });
}
