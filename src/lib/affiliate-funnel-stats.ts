import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { countAffiliateLinkRegistrations, fetchCisContactLogRegister } from '@/lib/cis-contact-log-register';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
} from '@/lib/shlink-server';
import type { AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

function utmFromLongUrl(longUrl: string): {
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
} {
  try {
    const u = new URL(longUrl);
    return {
      utmSource: u.searchParams.get('utm_source')?.trim() || undefined,
      utmCampaign: u.searchParams.get('utm_campaign')?.trim() || undefined,
      utmMedium: u.searchParams.get('utm_medium')?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export type AffiliateFunnelStatsResult =
  | { ok: true; data: AffiliateFunnelStatsResponse }
  | { ok: false; status: 404 | 500; error: string };

/** Load click + registration funnel stats for one affiliate link owned by a creator. */
export async function getAffiliateLinkFunnelStats(
  creatorId: string,
  linkId: string,
): Promise<AffiliateFunnelStatsResult> {
  const { data: linkRow, error: linkError } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url, creator_id, project_id, campaign_id')
    .eq('id', linkId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (linkError) {
    return { ok: false, status: 500, error: 'Failed to load affiliate link' };
  }
  if (!linkRow) {
    return { ok: false, status: 404, error: 'Affiliate link not found' };
  }

  let utmSource = 'creatorclub';
  let utmCampaign: string | undefined;
  let utmMedium: string | undefined;
  let cisProjectId: number | undefined;

  if (linkRow.campaign_id) {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('utm_source, utm_campaign, utm_medium')
      .eq('id', linkRow.campaign_id)
      .maybeSingle();
    if (campaign) {
      if (typeof campaign.utm_source === 'string' && campaign.utm_source.trim()) {
        utmSource = campaign.utm_source.trim();
      }
      if (typeof campaign.utm_campaign === 'string' && campaign.utm_campaign.trim()) {
        utmCampaign = campaign.utm_campaign.trim();
      }
      if (typeof campaign.utm_medium === 'string' && campaign.utm_medium.trim()) {
        utmMedium = campaign.utm_medium.trim();
      }
    }
  }

  if (linkRow.project_id) {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('cis_id')
      .eq('id', linkRow.project_id)
      .maybeSingle();
    if (project?.cis_id != null && Number.isFinite(Number(project.cis_id))) {
      cisProjectId = Number(project.cis_id);
    }
  }

  const cacheMap = await getAffiliateLinkClickStatsByIds([linkId]);
  const cached = cacheMap.get(linkId);
  let clicks = 0;
  const visit = rowToVisitStats(cached);
  if (visit?.total != null && Number.isFinite(visit.total)) {
    clicks = visit.total;
  } else {
    const apiKey = process.env.SHLINK_API_KEY;
    const url = linkRow.url?.trim() ?? '';
    const parsed = parseShlinkShortCode(url);
    if (apiKey && parsed) {
      const meta = await fetchShlinkShortUrlMeta(apiKey, parsed.shortCode, parsed.domain);
      if (meta) {
        const longUrl =
          typeof meta.longUrl === 'string'
            ? meta.longUrl
            : typeof meta.originalUrl === 'string'
              ? meta.originalUrl
              : '';
        if (longUrlBelongsToCreator(longUrl, creatorId)) {
          const live = visitsFromShlinkShortUrlJson(meta);
          if (live?.total != null && Number.isFinite(live.total)) {
            clicks = live.total;
          }
          const fromUrl = utmFromLongUrl(longUrl);
          if (!utmCampaign && fromUrl.utmCampaign) utmCampaign = fromUrl.utmCampaign;
          if (fromUrl.utmSource) utmSource = fromUrl.utmSource;
          if (!utmMedium && fromUrl.utmMedium) utmMedium = fromUrl.utmMedium;
        }
      }
    }
  }

  if (!utmCampaign && cached?.long_url) {
    const fromCache = utmFromLongUrl(cached.long_url.trim());
    if (fromCache.utmCampaign) utmCampaign = fromCache.utmCampaign;
    if (fromCache.utmSource) utmSource = fromCache.utmSource;
    if (fromCache.utmMedium) utmMedium = fromCache.utmMedium;
  }

  let registrations: number | null = null;
  let registrationsUnavailableReason: string | null = null;

  if (!process.env.CONTACT_LOGS_TOKEN) {
    registrationsUnavailableReason = 'CIS contact logs not configured';
  } else if (!utmCampaign) {
    registrationsUnavailableReason = 'ลิงก์นี้ไม่มี UTM Campaign สำหรับนับลงทะเบียน';
  } else {
    const logs = await fetchCisContactLogRegister({
      utmSource,
      utmCampaign,
      utmMedium,
    });
    if (logs == null) {
      registrationsUnavailableReason = 'ไม่สามารถดึงข้อมูลลงทะเบียนจาก CIS ได้';
    } else {
      registrations = countAffiliateLinkRegistrations(logs, creatorId, cisProjectId ?? null);
    }
  }

  const statsSyncedAt = maxSyncedAt([cached]);

  return {
    ok: true,
    data: {
      stages: [
        { key: 'clicks', label: 'คลิก', value: clicks, available: true },
        {
          key: 'registrations',
          label: 'ลงทะเบียน',
          value: registrations,
          available: registrations !== null,
        },
        { key: 'bookings', label: 'จอง', value: null, available: false },
        { key: 'transfers', label: 'โอนกรรมสิทธิ์', value: null, available: false },
      ],
      statsSyncedAt,
      registrationsUnavailableReason,
    },
  };
}
