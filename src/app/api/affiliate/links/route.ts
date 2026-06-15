import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type CreateLinkBody = {
  id?: string;
  url?: string;
  projectId?: string;
  campaignName?: string;
  campaignId?: string;
  postLinks?: unknown;
  createdAt?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as CreateLinkBody;
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const campaignName = typeof body.campaignName === 'string' ? body.campaignName.trim() : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : undefined;

    if (!url || !campaignName) {
      return NextResponse.json({ error: 'url and campaignName are required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('affiliate_links')
      .select('id')
      .eq('creator_id', auth.session.id)
      .eq('url', url)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, duplicate: true, id: existing.id });
    }

    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : crypto.randomUUID();
    const postLinks = Array.isArray(body.postLinks)
      ? body.postLinks.filter((item): item is string => typeof item === 'string')
      : [];

    const { error } = await supabaseAdmin.from('affiliate_links').insert({
      id,
      creator_id: auth.session.id,
      campaign_name: campaignName,
      project_id: projectId ?? null,
      campaign_id: campaignId ?? null,
      url,
      post_links: postLinks,
      created_at: typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
    });

    if (error) {
      console.error('affiliate/links POST:', error);
      return NextResponse.json({ error: 'Failed to save affiliate link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, duplicate: false });
  } catch (error) {
    console.error('affiliate/links POST error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/links',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
