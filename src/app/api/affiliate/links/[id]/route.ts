import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type UpdateLinkBody = {
  campaignName?: string;
  url?: string;
  projectId?: string | null;
  postLinks?: unknown;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing link id' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as UpdateLinkBody;
    const patch: Record<string, unknown> = {};

    if (typeof body.campaignName === 'string') patch.campaign_name = body.campaignName.trim();
    if (typeof body.url === 'string') patch.url = body.url.trim();
    if (body.projectId !== undefined) patch.project_id = body.projectId || null;
    if (Array.isArray(body.postLinks)) {
      patch.post_links = body.postLinks.filter((item): item is string => typeof item === 'string');
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('affiliate_links')
      .update(patch)
      .eq('id', id)
      .eq('creator_id', auth.session.id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('affiliate/links PATCH:', error);
      return NextResponse.json({ error: 'Failed to update affiliate link' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Affiliate link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('affiliate/links PATCH error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/links/[id]',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
