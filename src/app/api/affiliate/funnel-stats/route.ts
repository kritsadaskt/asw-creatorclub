import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateLinkFunnelStats } from '@/lib/affiliate-funnel-stats';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';

export type { AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

export async function GET(request: NextRequest) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  const linkId = request.nextUrl.searchParams.get('linkId')?.trim();
  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
  }

  try {
    const result = await getAffiliateLinkFunnelStats(auth.session.id, linkId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data, { status: 200 });
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
