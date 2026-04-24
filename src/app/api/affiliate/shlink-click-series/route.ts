import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/modules/utils/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  fetchShlinkShortUrlVisits,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
} from '@/lib/shlink-server';

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
};

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
  const parsed = parseShlinkShortCode(url);
  if (!parsed) {
    const empty: ClickSeriesResponse = {
      days,
      points: [],
      totals: { days3: 0, days7: 0, days30: 0 },
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
  if (!meta) {
    const empty: ClickSeriesResponse = {
      days,
      points: [],
      totals: { days3: 0, days7: 0, days30: 0 },
    };
    return NextResponse.json(empty, { status: 200 });
  }

  const longUrl =
    typeof meta.longUrl === 'string'
      ? meta.longUrl
      : typeof meta.originalUrl === 'string'
        ? meta.originalUrl
        : '';

  if (!longUrlBelongsToCreator(longUrl, creatorId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));
  const startDateIso = startDate.toISOString();
  const endDateIso = today.toISOString();

  const visits = await fetchShlinkShortUrlVisits(apiKey, parsed.shortCode, parsed.domain, {
    startDate: startDateIso,
    endDate: endDateIso,
    itemsPerPage: 500,
    maxPages: 20,
  });

  if (!visits) {
    return NextResponse.json({ error: 'Failed to load click visits' }, { status: 500 });
  }

  const perDayMap = new Map<string, number>();
  for (const visit of visits) {
    const key = visit.date.slice(0, 10);
    if (!key) continue;
    perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
  }

  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKey(d);
    points.push({ date: key, clicks: perDayMap.get(key) ?? 0 });
  }

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
