import { NextRequest, NextResponse } from 'next/server';
import { isAffiliateGetLinkEnabled } from '@/lib/affiliate-get-link';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createTinyurlShortUrl, isTinyurlConfigured } from '@/lib/tinyurl-server';

type ExistingLinkRow = { id: string; url: string };

/**
 * Latest affiliate_links row for this creator + project (+ campaign when set).
 * Campaign mode and non-campaign mode are separate scopes.
 *
 * Bootcamp does not use this lookup. Matching only `project_id = X` misses older
 * rows that were stored with a null project, and matching only null rows inserts
 * a second link once the first row has been backfilled.
 */
async function findExistingAffiliateLink(params: {
  creatorId: string;
  projectId?: string;
  campaignId?: string;
  campaignName?: string;
}): Promise<ExistingLinkRow | null> {
  const hasCampaignScope = Boolean(params.campaignId || params.campaignName?.trim());
  if (!params.projectId && !hasCampaignScope) return null;

  let query = supabaseAdmin
    .from('affiliate_links')
    .select('id, url')
    .eq('creator_id', params.creatorId);

  if (params.projectId) {
    query = query.eq('project_id', params.projectId);
  } else {
    query = query.is('project_id', null);
  }

  if (params.campaignId) {
    query = query.eq('campaign_id', params.campaignId);
  } else if (params.campaignName?.trim()) {
    // Campaign-name scope (e.g. Bootcamp) must not collide with plain project links
    query = query.is('campaign_id', null).eq('campaign_name', params.campaignName.trim());
  } else {
    query = query.is('campaign_id', null);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('affiliate/shorten existing lookup:', error);
    return null;
  }
  if (!data?.url?.trim()) return null;
  return { id: data.id, url: data.url.trim() };
}

type BootcampLinkRow = { id: string; url: string | null; project_id: string | null };

/**
 * Reuse every Bootcamp row for this creator + campaign name, including rows
 * whose project_id is still null. Backfill those rows so the dashboard can
 * resolve the project, and do not create another short link.
 */
async function reuseBootcampLink(params: {
  creatorId: string;
  projectId: string;
  campaignName: string;
}): Promise<{ link: ExistingLinkRow | null; error: string | null }> {
  const campaignName = params.campaignName.trim();
  const projectId = params.projectId.trim();
  if (!campaignName || !projectId) return { link: null, error: null };

  const { data, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url, project_id')
    .eq('creator_id', params.creatorId)
    .is('campaign_id', null)
    .eq('campaign_name', campaignName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('affiliate/shorten bootcamp lookup:', error);
    return { link: null, error: error.message };
  }

  const rows = (data ?? []) as BootcampLinkRow[];
  const missingProjectIds = rows.filter((row) => !row.project_id).map((row) => row.id);
  if (missingProjectIds.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_links')
      .update({ project_id: projectId })
      .in('id', missingProjectIds);
    if (updateError) {
      console.error('affiliate/shorten bootcamp project_id backfill:', updateError);
    }
  }

  const withUrl = rows.find((row) => row.url?.trim());
  if (!withUrl?.url) return { link: null, error: null };
  return { link: { id: withUrl.id, url: withUrl.url.trim() }, error: null };
}

export async function POST(request: NextRequest) {
  let projectUrl: string;
  let projectId: string | undefined;
  let campaignId: string | undefined;
  let campaignKey: string | undefined;
  let campaignName: string | undefined;
  let utmSource: string;
  let utmMedium: string;
  let utmCampaign: string;
  let utmContent: string;
  let utmOverride: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmId?: string;
    utmContent?: string;
  } | null = null;

  try {
    const body = await request.json();
    projectUrl = body.projectUrl;
    projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
    campaignId = typeof body.campaignId === 'string' ? body.campaignId : undefined;
    campaignKey = typeof body.campaignKey === 'string' ? body.campaignKey : undefined;
    campaignName = typeof body.campaignName === 'string' ? body.campaignName.trim() : undefined;
    utmSource = body.utmSource;
    utmMedium = body.utmMedium;
    utmCampaign = body.utmCampaign;
    utmContent = body.utmContent ?? body.utmId;
    utmOverride = body.utmOverride && typeof body.utmOverride === 'object' ? body.utmOverride : null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const isBootcampMission = campaignKey === 'creator-bootcamp';
  if (!isAffiliateGetLinkEnabled() && !isBootcampMission) {
    return NextResponse.json(
      { error: 'Affiliate get link is disabled', code: 'AFFILIATE_GET_LINK_DISABLED' },
      { status: 503 },
    );
  }

  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  if (!isTinyurlConfigured()) {
    return NextResponse.json({ error: 'TinyURL API not configured' }, { status: 503 });
  }

  const creatorId = auth.session.id;

  const resolvedBootcampCampaignName = (campaignName || 'Creators Bootcamp').trim();

  if (isBootcampMission && !projectId?.trim()) {
    return NextResponse.json({ error: 'projectId is required for bootcamp links' }, { status: 400 });
  }

  // Reuse previously generated short link for the same creator + project (+ campaign)
  let existing: ExistingLinkRow | null = null;
  if (isBootcampMission && projectId) {
    const reused = await reuseBootcampLink({
      creatorId,
      projectId,
      campaignName: resolvedBootcampCampaignName,
    });
    if (reused.error) {
      return NextResponse.json({ error: 'Failed to load existing bootcamp link' }, { status: 500 });
    }
    existing = reused.link;
  } else {
    existing = await findExistingAffiliateLink({
      creatorId,
      projectId,
      campaignId,
      campaignName,
    });
  }

  if (existing) {
    return NextResponse.json({
      shortUrl: existing.url,
      linkId: existing.id,
      reused: true,
    });
  }

  let longUrlObj: URL;
  try {
    longUrlObj = new URL(projectUrl);
  } catch {
    return NextResponse.json({ error: 'projectUrl is invalid' }, { status: 400 });
  }
  const finalUtmSource = utmOverride?.utmSource || utmSource;
  const finalUtmMedium = utmOverride?.utmMedium || utmMedium;
  const finalUtmCampaign = utmOverride?.utmCampaign || utmCampaign;
  const finalUtmContent = utmOverride?.utmContent || utmOverride?.utmId || utmContent;
  longUrlObj.searchParams.set('utm_source', finalUtmSource);
  longUrlObj.searchParams.set('utm_medium', finalUtmMedium);
  longUrlObj.searchParams.set('utm_campaign', finalUtmCampaign);
  longUrlObj.searchParams.set('utm_content', finalUtmContent);
  longUrlObj.searchParams.delete('utm_id');
  longUrlObj.searchParams.set('ref', creatorId);
  const longUrl = longUrlObj.toString();

  // Prefer short tags (TinyURL max 45 chars per tag) — skip raw UUIDs that blow the limit
  const tags = [
    isBootcampMission ? 'creator-bootcamp' : '',
    campaignKey ? `campaign:${campaignKey}` : '',
    projectId && projectId.length <= 36 ? `project:${projectId.slice(0, 32)}` : '',
  ].filter(Boolean);

  const result = await createTinyurlShortUrl({
    longUrl,
    tags,
    description: isBootcampMission ? 'Creators Bootcamp Mission' : undefined,
  });
  if (!result.ok) {
    console.error('TinyURL create error:', result.status, result.detail);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/shorten',
      severity: result.status >= 500 ? 'error' : 'warn',
      message: `TinyURL returned ${result.status}`,
      context: {
        ...requestLogContext(request),
        status: result.status,
        detail: result.detail.slice(0, 400),
      },
    });
    return NextResponse.json(
      { error: 'TinyURL returned an error', detail: result.detail },
      { status: 502 },
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[affiliate/shorten] longUrl:', longUrl);
    console.log('[affiliate/shorten] shortUrl:', result.shortUrl);
  }

  const shortUrl = result.shortUrl.trim();
  const { data: sameUrlRows, error: sameUrlError } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, url, project_id')
    .eq('creator_id', creatorId)
    .eq('url', shortUrl)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sameUrlError) {
    console.error('affiliate/shorten same-url lookup:', sameUrlError);
  } else if (sameUrlRows && sameUrlRows.length > 0) {
    const row = sameUrlRows[0] as { id: string; url: string | null; project_id: string | null };
    if (projectId && !row.project_id) {
      const { error: backfillError } = await supabaseAdmin
        .from('affiliate_links')
        .update({ project_id: projectId })
        .eq('id', row.id);
      if (backfillError) {
        console.error('affiliate/shorten same-url project backfill:', backfillError);
      }
    }
    return NextResponse.json({
      shortUrl: row.url?.trim() || shortUrl,
      linkId: row.id,
      reused: true,
    });
  }

  // Persist immediately after TinyURL succeeds (do not wait for creator to copy)
  const linkId = crypto.randomUUID();
  const resolvedCampaignName = isBootcampMission
    ? resolvedBootcampCampaignName
    : campaignName || campaignKey || 'Affiliate';

  const { error: insertError } = await supabaseAdmin.from('affiliate_links').insert({
    id: linkId,
    creator_id: creatorId,
    campaign_name: resolvedCampaignName,
    project_id: projectId ?? null,
    campaign_id: campaignId ?? null,
    url: shortUrl,
    post_links: [],
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('affiliate/shorten persist:', insertError);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/shorten',
      severity: 'error',
      message: insertError.message,
      context: requestLogContext(request),
    });
    // Still return the short URL — TinyURL already created it; client can show/copy
    return NextResponse.json({
      shortUrl,
      linkId: null,
      reused: false,
      persistError: true,
    });
  }

  return NextResponse.json({
    shortUrl,
    linkId,
    reused: false,
  });
}
