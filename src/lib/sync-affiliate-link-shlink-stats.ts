import {
  combineAffiliateClickTotals,
  raiseShlinkBaseline,
} from '@/lib/affiliate-click-totals';
import { mapWithConcurrency } from '@/lib/concurrency';
import { fetchShlinkVisitTotal, isShlinkConfigured } from '@/lib/shlink-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchTinyurlHits,
  fetchTinyurlTimelineDaily,
  parseShortlinkAlias,
} from '@/lib/tinyurl-server';

const META_CONCURRENCY = 8;
const DAILY_RANGE_DAYS = 35;

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

type ExistingStat = {
  shlinkBaseline: number;
  tinyurlHits: number;
};

/**
 * Sync click totals:
 *   total_visits = shlink_baseline + tinyurl_hits
 * Raises shlink_baseline from live Shlink (while SHLINK_API_KEY is set) so old /c clicks still count.
 */
export async function syncAffiliateLinkShortlinkStatsFromTinyurl(): Promise<SyncAffiliateLinkShortlinkStatsResult> {
  const { data: rows, error } = await supabaseAdmin.from('affiliate_links').select('id, url');

  if (error) {
    console.error('sync shortlink stats affiliate_links:', error);
    throw error;
  }

  const list = (rows ?? []) as { id: string; url: string | null }[];
  const existingById = new Map<string, ExistingStat>();
  {
    const ids = list.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data: statsRows } = await supabaseAdmin
        .from('affiliate_link_click_stats')
        .select('affiliate_link_id, shlink_baseline, tinyurl_hits, total_visits')
        .in('affiliate_link_id', chunk);
      for (const s of statsRows ?? []) {
        const baselineRaw = s.shlink_baseline ?? s.total_visits;
        const baseline =
          baselineRaw != null && Number.isFinite(Number(baselineRaw))
            ? Math.max(0, Math.trunc(Number(baselineRaw)))
            : 0;
        const hitsRaw = s.tinyurl_hits;
        const hits =
          hitsRaw != null && Number.isFinite(Number(hitsRaw))
            ? Math.max(0, Math.trunc(Number(hitsRaw)))
            : 0;
        existingById.set(s.affiliate_link_id, { shlinkBaseline: baseline, tinyurlHits: hits });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (DAILY_RANGE_DAYS - 1));
  const from = formatDateKey(start);
  const to = formatDateKey(today);
  const shlinkLive = isShlinkConfigured();

  let metaUpserted = 0;
  let metaFailed = 0;
  let dailyLinksUpdated = 0;
  let dailyFailed = 0;

  await mapWithConcurrency(list, META_CONCURRENCY, async (row) => {
    const prev = existingById.get(row.id) ?? { shlinkBaseline: 0, tinyurlHits: 0 };
    const url = row.url?.trim() ?? '';

    if (!url) {
      const total = combineAffiliateClickTotals(prev.shlinkBaseline, prev.tinyurlHits);
      await supabaseAdmin.from('affiliate_link_click_stats').upsert(
        {
          affiliate_link_id: row.id,
          shlink_baseline: prev.shlinkBaseline,
          tinyurl_hits: prev.tinyurlHits,
          total_visits: total,
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
      metaUpserted += 1;
      return;
    }

    let shlinkBaseline = prev.shlinkBaseline;
    if (shlinkLive) {
      const liveShlink = await fetchShlinkVisitTotal(parsed.alias);
      shlinkBaseline = raiseShlinkBaseline(shlinkBaseline, liveShlink);
    }

    const tiny = await fetchTinyurlHits(parsed.alias, parsed.domain);
    const tinyurlHits =
      tiny.hits != null && Number.isFinite(tiny.hits)
        ? Math.max(0, Math.trunc(tiny.hits))
        : prev.tinyurlHits;
    const longUrl = tiny.longUrl || null;
    const totalVisits = combineAffiliateClickTotals(shlinkBaseline, tinyurlHits);

    const { error: upErr } = await supabaseAdmin.from('affiliate_link_click_stats').upsert(
      {
        affiliate_link_id: row.id,
        shlink_baseline: shlinkBaseline,
        tinyurl_hits: tinyurlHits,
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
  _apiKey?: string,
): Promise<SyncAffiliateLinkShortlinkStatsResult> {
  return syncAffiliateLinkShortlinkStatsFromTinyurl();
}
