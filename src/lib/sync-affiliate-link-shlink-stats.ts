import { mapWithConcurrency } from '@/lib/concurrency';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  fetchShlinkShortUrlVisits,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
} from '@/lib/shlink-server';

const META_CONCURRENCY = 8;
const DAILY_RANGE_DAYS = 35;

function longUrlFromMeta(meta: Record<string, unknown>): string {
  if (typeof meta.longUrl === 'string') return meta.longUrl;
  if (typeof meta.originalUrl === 'string') return meta.originalUrl;
  return '';
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type SyncAffiliateLinkShlinkStatsResult = {
  linksTotal: number;
  metaUpserted: number;
  metaFailed: number;
  dailyLinksUpdated: number;
  dailyFailed: number;
};

/**
 * Fetches Shlink metadata (and optional daily visit breakdown) for all affiliate links
 * and upserts `affiliate_link_click_stats` / `affiliate_link_daily_clicks`.
 */
export async function syncAffiliateLinkShlinkStatsFromShlink(apiKey: string): Promise<SyncAffiliateLinkShlinkStatsResult> {
  const { data: rows, error } = await supabaseAdmin.from('affiliate_links').select('id, url');

  if (error) {
    console.error('sync shlink stats affiliate_links:', error);
    throw error;
  }

  const list = (rows ?? []) as { id: string; url: string | null }[];
  const nowIso = new Date().toISOString();
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (DAILY_RANGE_DAYS - 1));
  const startDateIso = start.toISOString();
  const endDateIso = today.toISOString();

  let metaUpserted = 0;
  let metaFailed = 0;
  let dailyLinksUpdated = 0;
  let dailyFailed = 0;

  await mapWithConcurrency(list, META_CONCURRENCY, async (row) => {
    const url = row.url?.trim() ?? '';
    if (!url) {
      await supabaseAdmin.from('affiliate_link_click_stats').upsert(
        {
          affiliate_link_id: row.id,
          total_visits: null,
          non_bot_visits: null,
          long_url: null,
          synced_at: nowIso,
        },
        { onConflict: 'affiliate_link_id' },
      );
      metaUpserted += 1;
      return;
    }

    const parsed = parseShlinkShortCode(url);
    if (!parsed) {
      await supabaseAdmin.from('affiliate_link_click_stats').upsert(
        {
          affiliate_link_id: row.id,
          total_visits: null,
          non_bot_visits: null,
          long_url: null,
          synced_at: nowIso,
        },
        { onConflict: 'affiliate_link_id' },
      );
      metaUpserted += 1;
      return;
    }

    const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
    if (!meta) {
      metaFailed += 1;
      return;
    }

    const stats = visitsFromShlinkShortUrlJson(meta);
    const longUrl = longUrlFromMeta(meta);
    const totalVisits = stats?.total != null && Number.isFinite(stats.total) ? Math.trunc(stats.total) : null;
    const nonBot =
      stats?.nonBots != null && Number.isFinite(stats.nonBots) ? Math.trunc(stats.nonBots) : null;

    const { error: upErr } = await supabaseAdmin.from('affiliate_link_click_stats').upsert(
      {
        affiliate_link_id: row.id,
        total_visits: totalVisits,
        non_bot_visits: nonBot,
        long_url: longUrl || null,
        synced_at: nowIso,
      },
      { onConflict: 'affiliate_link_id' },
    );

    if (upErr) {
      console.error('sync shlink stats upsert meta:', upErr);
      metaFailed += 1;
      return;
    }
    metaUpserted += 1;

    if (totalVisits == null || totalVisits <= 0) {
      return;
    }

    const visits = await fetchShlinkShortUrlVisits(apiKey, parsed.shortCode, parsed.domain, {
      startDate: startDateIso,
      endDate: endDateIso,
      itemsPerPage: 500,
      maxPages: 20,
    });

    if (!visits) {
      dailyFailed += 1;
      return;
    }

    const perDay = new Map<string, number>();
    for (const v of visits) {
      const key = v.date.slice(0, 10);
      if (!key) continue;
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }

    const dailyRows = [...perDay.entries()].map(([click_date, clicks]) => ({
      affiliate_link_id: row.id,
      click_date,
      clicks,
      synced_at: nowIso,
    }));

    if (dailyRows.length > 0) {
      const { error: dErr } = await supabaseAdmin.from('affiliate_link_daily_clicks').upsert(dailyRows, {
        onConflict: 'affiliate_link_id,click_date',
      });
      if (dErr) {
        console.error('sync shlink stats daily upsert:', dErr);
        dailyFailed += 1;
        return;
      }
    }

    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - (DAILY_RANGE_DAYS + 5));
    const cutoffStr = formatDateKey(cutoff);
    await supabaseAdmin
      .from('affiliate_link_daily_clicks')
      .delete()
      .eq('affiliate_link_id', row.id)
      .lt('click_date', cutoffStr);

    dailyLinksUpdated += 1;
  });

  return {
    linksTotal: list.length,
    metaUpserted,
    metaFailed,
    dailyLinksUpdated,
    dailyFailed,
  };
}
