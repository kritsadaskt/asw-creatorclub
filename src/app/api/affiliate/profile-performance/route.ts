import { NextRequest, NextResponse } from 'next/server';
import { getCreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { requireApprovedCreatorSession } from '@/lib/require-approved-creator';

export type { CreatorAffiliatePerformance } from '@/lib/creator-affiliate-performance';

export async function GET(request: NextRequest) {
  const auth = await requireApprovedCreatorSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await getCreatorAffiliatePerformance(auth.session.id);
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
