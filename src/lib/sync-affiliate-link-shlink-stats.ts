import { mapWithConcurrency } from '@/lib/concurrency';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlAliasMeta,
  fetchTinyurlTimelineDaily,
  parseShortlinkAlias,
  visitsFromTinyurlAliasJson,
} from '@/lib/tinyurl-server';

const META_CONCURRENCY = 8;
const DAILY_RANGE_DAYS = 35;

function longUrlFromTinyMeta(meta: Record<string, unknown>): string {
  const data = (meta.data && typeof meta.data === 'object' ? meta.data : meta) as Record<
    string,
    unknown
  >;
  if (typeof data.url === 'string') return data.url;
  if (typeof data.longUrl === 'string') return data.longUrl;
  return '';
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type SyncAffiliateLinkShortlinkStatsResult = {
  linksTotal: number;
  metaUpserted: number;
  metaFailed: number;
  dailyLinksUpdated: number;
  dailyFailed: number;
};

/** @deprecated Use SyncAffiliateLinkShortlinkStatsResult */
export type SyncAffiliateLinkShlinkStatsResult = SyncAffiliateLinkShortlinkStatsResult;

/**
 * Sync click totals from TinyURL into affiliate_link_click_stats (monotonic vs existing cache)
 * and daily series from timeline analytics.
 */
export async function syncAffiliateLinkShortlinkStatsFromTinyurl(): Promise<SyncAffiliateLinkShortlinkStatsResult> {
  const { data: rows, error } = await supabaseAdmin.from('affiliate_links').select('id, url');

  if (error) {
    console.error('sync shortlink stats affiliate_links:', error);
    throw error;
  }

  const list = (rows ?? []) as { id: string; url: string | null }[];

  const existingById = new Map<string, number | null>();
  {
    const ids = list.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data: statsRows } = await supabaseAdmin
        .from('affiliate_link_click_stats')
        .select('affiliate_link_id, total_visits')
        .in('affiliate_link_id', chunk);
      for (const s of statsRows ?? []) {
        existingById.set(
          s.affiliate_link_id,
          s.total_visits == null ? null : Number(s.total_visits),
        );
      }
    }
  }

  const nowIso = new Date().toISOString();
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (DAILY_RANGE_DAYS - 1));
  const from = formatDateKey(start);
  const to = formatDateKey(today);

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
          total_visits: existingById.get(row.id) ?? null,
          non_bot_visits: null,
          long_url: null,
          synced_at: nowIso,
        },
        { onConflict: 'affiliate_link_id' },
      );
      metaUpserted += 1;
      return;
    }

    const parsed = parseShortlinkAlias(url);
    if (!parsed) {
      // Keep existing cache; URL may be a non-short long URL
      metaUpserted += 1;
      return;
    }

    const meta = await fetchTinyurlAliasMeta(parsed.alias, parsed.domain);
    if (!meta) {
      metaFailed += 1;
      return;
    }

    const stats = visitsFromTinyurlAliasJson(meta);
    const longUrl = longUrlFromTinyMeta(meta);
    const tinyTotal =
      stats?.total != null && Number.isFinite(stats.total) ? Math.trunc(stats.total) : null;
    const prev = existingById.get(row.id);
    // Monotonic: never drop below frozen Shlink / prior cache totals
    const totalVisits =
      tinyTotal == null
        ? prev ?? null
        : prev != null && Number.isFinite(prev)
          ? Math.max(Math.trunc(prev), tinyTotal)
          : tinyTotal;

    const { error: upErr } = await supabaseAdmin.from('affiliate_link_click_stats').upsert(
      {
        affiliate_link_id: row.id,
        total_visits: totalVisits,
        non_bot_visits: null,
        long_url: longUrl || null,
        synced_at: nowIso,
      },
      { onConflict: 'affiliate_link_id' },
    );

    if (upErr) {
      console.error('sync shortlink stats upsert meta:', upErr);
      metaFailed += 1;
      return;
    }
    metaUpserted += 1;

    const daily = await fetchTinyurlTimelineDaily(parsed.alias, {
      from,
      to,
      domain: parsed.domain,
    });
    if (!daily) {
      dailyFailed += 1;
      return;
    }

    const dailyRows = daily
      .filter((d) => d.clicks > 0)
      .map((d) => ({
        affiliate_link_id: row.id,
        click_date: d.date,
        clicks: d.clicks,
        synced_at: nowIso,
      }));

    if (dailyRows.length > 0) {
      const { error: dErr } = await supabaseAdmin.from('affiliate_link_daily_clicks').upsert(dailyRows, {
        onConflict: 'affiliate_link_id,click_date',
      });
      if (dErr) {
        console.error('sync shortlink stats daily upsert:', dErr);
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

/** @deprecated Prefer syncAffiliateLinkShortlinkStatsFromTinyurl */
export async function syncAffiliateLinkShlinkStatsFromShlink(
  _apiKey?: string
): Promise<SyncAffiliateLinkShortlinkStatsResult> {
  return syncAffiliateLinkShortlinkStatsFromTinyurl();
}
