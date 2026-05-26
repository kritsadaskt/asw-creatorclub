import { NextRequest, NextResponse } from 'next/server';
import { getCreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

export type { CreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await getCreatorAffiliatePerformance(session.id);
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('affiliate profile-performance error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/profile-performance',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Failed to load affiliate performance' }, { status: 500 });
  }
}
