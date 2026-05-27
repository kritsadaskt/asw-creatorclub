import { NextRequest, NextResponse } from 'next/server';
import { getCreatorAffiliateClickStats } from '@/lib/creator-affiliate-click-stats';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import type { ShlinkVisitStats } from '@/lib/shlink-server';
import { getServerSession } from '@/modules/utils/auth';

type RouteParams = { params: Promise<{ id: string }> };

type AdminCreatorAffiliateClicksResponse = {
  stats: Record<string, ShlinkVisitStats | null>;
  shlinkConfigured: boolean;
  statsSyncedAt?: string | null;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: creatorId } = await params;
  if (!creatorId) {
    return NextResponse.json({ error: 'Missing creator id' }, { status: 400 });
  }

  try {
    const { stats, shlinkConfigured, statsSyncedAt } = await getCreatorAffiliateClickStats(creatorId);

    const body: AdminCreatorAffiliateClicksResponse = {
      stats,
      shlinkConfigured,
      statsSyncedAt,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error('admin creator affiliate-clicks error:', err);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/affiliate-clicks',
      severity: 'error',
      error: err,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to load click stats' }, { status: 500 });
  }
}
