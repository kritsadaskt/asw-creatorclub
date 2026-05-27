import { NextRequest, NextResponse } from 'next/server';
import { getCreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

export type { CreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';

type RouteParams = { params: Promise<{ id: string }> };

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
    const body = await getCreatorAffiliatePerformance(creatorId);
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('admin creator affiliate-performance error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/affiliate-performance',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to load affiliate performance' }, { status: 500 });
  }
}
