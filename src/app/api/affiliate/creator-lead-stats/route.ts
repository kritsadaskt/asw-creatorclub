import { NextRequest, NextResponse } from 'next/server';
import {
  countCreatorRegistrations,
  fetchCreatorClubContactLogs,
} from '@/lib/cis-contact-log-register';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

export type CreatorLeadStatsResponse = {
  registrations: number | null;
  bookings: number;
  transfers: number;
};

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let registrations: number | null = null;

    if (process.env.CONTACT_LOGS_TOKEN) {
      const logs = await fetchCreatorClubContactLogs();
      registrations = logs == null ? null : countCreatorRegistrations(logs, session.id);
    }

    const body: CreatorLeadStatsResponse = {
      registrations,
      bookings: 0,
      transfers: 0,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error('creator-lead-stats error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:affiliate/creator-lead-stats',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
