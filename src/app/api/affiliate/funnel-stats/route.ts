import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateLinkFunnelStats } from '@/lib/affiliate-funnel-stats';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

export type { AffiliateFunnelStatsResponse } from '@/modules/types/affiliateFunnel';

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const linkId = request.nextUrl.searchParams.get('linkId')?.trim();
  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
  }

  try {
    const result = await getAffiliateLinkFunnelStats(session.id, linkId);
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
