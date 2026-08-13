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
 */
async function findExistingAffiliateLink(params: {
  creatorId: string;
  projectId?: string;
  campaignId?: string;
}): Promise<ExistingLinkRow | null> {
  if (!params.projectId) return null;

  let query = supabaseAdmin
    .from('affiliate_links')
    .select('id, url')
    .eq('creator_id', params.creatorId)
    .eq('project_id', params.projectId);

  if (params.campaignId) {
    query = query.eq('campaign_id', params.campaignId);
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

export async function POST(request: NextRequest) {
  if (!isAffiliateGetLinkEnabled()) {
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

  // Reuse previously generated short link for the same creator + project (+ campaign)
  const existing = await findExistingAffiliateLink({ creatorId, projectId, campaignId });
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
    campaignKey ? `campaign:${campaignKey}` : '',
    projectId && projectId.length <= 36 ? `project:${projectId.slice(0, 32)}` : '',
  ].filter(Boolean);

  const result = await createTinyurlShortUrl({ longUrl, tags });
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

  // Persist immediately after TinyURL succeeds (do not wait for creator to copy)
  const linkId = crypto.randomUUID();
  const resolvedCampaignName =
    campaignName ||
    campaignKey ||
    'Affiliate';

  const { error: insertError } = await supabaseAdmin.from('affiliate_links').insert({
    id: linkId,
    creator_id: creatorId,
    campaign_name: resolvedCampaignName,
    project_id: projectId ?? null,
    campaign_id: campaignId ?? null,
    url: result.shortUrl,
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
      shortUrl: result.shortUrl,
      linkId: null,
      reused: false,
      persistError: true,
    });
  }

  return NextResponse.json({
    shortUrl: result.shortUrl,
    linkId,
    reused: false,
  });
}
