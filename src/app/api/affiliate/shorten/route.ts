import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getShlinkBaseUrl } from '@/lib/shlink-server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.SHLINK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Shlink API key not configured' }, { status: 503 });
  }

  let creatorId: string;
  let projectUrl: string;
  let projectId: string | undefined;
  let campaignId: string | undefined;
  let campaignKey: string | undefined;
  let utmSource: string;
  let utmMedium: string;
  let utmCampaign: string;
  let utmContent: string;
  let utmOverride: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmId?: string; utmContent?: string } | null = null;

  try {
    const body = await request.json();
    creatorId = body.creatorId;
    projectUrl = body.projectUrl;
    projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
    campaignId = typeof body.campaignId === 'string' ? body.campaignId : undefined;
    campaignKey = typeof body.campaignKey === 'string' ? body.campaignKey : undefined;
    utmSource = body.utmSource;
    utmMedium = body.utmMedium;
    utmCampaign = body.utmCampaign;
    utmContent = body.utmContent ?? body.utmId;
    utmOverride = body.utmOverride && typeof body.utmOverride === 'object' ? body.utmOverride : null;

    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
  const shlinkTags = [campaignKey, campaignId, creatorId, projectId]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value, index) =>
      index === 0
        ? `campaign:${value}`
        : index === 1
          ? `campaign_id:${value}`
          : index === 2
            ? `creator:${value}`
            : `project:${value}`,
    );
  //const customSlug = `ref-${creatorId.slice(0, 8)}`;

  let shlinkRes: Response;
  try {
    shlinkRes = await fetch(`${getShlinkBaseUrl()}/rest/v3/short-urls`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ longUrl, findIfExists: true, tags: shlinkTags }),
    });
  } catch (err) {
    console.error('Shlink fetch error:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/shorten',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to reach Shlink service' }, { status: 502 });
  }

  if (!shlinkRes.ok) {
    const detail = await shlinkRes.text().catch(() => '');
    console.error('Shlink error response:', shlinkRes.status, detail);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/shorten',
      severity: 'warn',
      message: `Shlink returned ${shlinkRes.status}`,
      context: {
        ...requestLogContext(request),
        status: shlinkRes.status,
        detail: detail.slice(0, 400),
      },
    });
    return NextResponse.json(
      { error: 'Shlink returned an error', detail },
      { status: 502 },
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[affiliate/shorten] longUrl:', longUrl);
  }

  const data = await shlinkRes.json();
  return NextResponse.json({ shortUrl: data.shortUrl });
}
