import { NextRequest, NextResponse } from 'next/server';
import {
  getAffiliateLinkClickStatsByIds,
  maxSyncedAt,
  rowToVisitStats,
} from '@/lib/affiliate-link-click-cache';
import { countAffiliateLinkRegistrations, fetchCisContactLogRegister } from '@/lib/cis-contact-log-register';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  fetchShlinkShortUrlMeta,
  longUrlBelongsToCreator,
  parseShlinkShortCode,
  visitsFromShlinkShortUrlJson,
} from '@/lib/shlink-server';

import type { AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

export type { AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

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

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creatorId = session.id;
  const linkId = request.nextUrl.searchParams.get('linkId')?.trim();
  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
  }

  try {
    const { data: linkRow, error: linkError } = await supabaseAdmin
      .from('affiliate_links')
      .select('id, url, creator_id, project_id, campaign_id')
      .eq('id', linkId)
      .eq('creator_id', creatorId)
      .maybeSingle();

    if (linkError) {
      return NextResponse.json({ error: 'Failed to load affiliate link' }, { status: 500 });
    }
    if (!linkRow) {
      return NextResponse.json({ error: 'Affiliate link not found' }, { status: 404 });
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

    const body: AffiliateFunnelStatsResponse = {
      stages: [
        { key: 'clicks', label: 'คลิก', value: clicks, available: true },
        {
          key: 'registrations',
          label: 'ลงทะเบียน',
          value: registrations,
          available: registrations !== null,
        },
      ],
      statsSyncedAt,
      registrationsUnavailableReason,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('affiliate funnel-stats error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/funnel-stats',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
