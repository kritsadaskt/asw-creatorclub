import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCisContactLogHistory,
  isValidCisDate,
  normalizeCustomerIds,
} from '@/lib/cis-contact-log-history';
import { todayIsoDate } from '@/lib/lead-timeline';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

export const maxDuration = 60;

/** Guards against an admin session being used to dump the whole CRM in one call. */
const MAX_CUSTOMER_IDS = 500;

/**
 * POST /api/admin/contact-logs/history
 *
 * Body: { customerIds: number[], startDate?: 'YYYY-MM-DD', endDate?: 'YYYY-MM-DD' }
 *
 * Returns every CIS touchpoint (register, follow-up calls, site visits) for the given
 * customers. Uses POST rather than GET because the id list outgrows a safe query string.
 */
export async function POST(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const rawIds = (payload as { customerIds?: unknown }).customerIds;
    if (!Array.isArray(rawIds)) {
      return NextResponse.json({ error: 'customerIds must be an array' }, { status: 400 });
    }

    const customerIds = normalizeCustomerIds(rawIds as Array<number | string>);
    if (customerIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }
    if (customerIds.length > MAX_CUSTOMER_IDS) {
      return NextResponse.json(
        { error: `customerIds exceeds the limit of ${MAX_CUSTOMER_IDS}` },
        { status: 400 },
      );
    }

    const rawStart = String((payload as { startDate?: unknown }).startDate ?? '').trim();
    const rawEnd = String((payload as { endDate?: unknown }).endDate ?? '').trim();
    const endDate = isValidCisDate(rawEnd) ? rawEnd : todayIsoDate();
    const startDate = isValidCisDate(rawStart) ? rawStart : '2000-01-01';

    const result = await fetchCisContactLogHistory({ customerIds, startDate, endDate });

    if (!result.ok) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/contact-logs/history',
        severity: 'warn',
        message: result.reason,
        context: {
          ...requestLogContext(request),
          cisStatus: result.status ?? null,
          customerIdCount: customerIds.length,
          startDate,
          endDate,
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch contact log history from external API',
          detail: result.reason,
          status: result.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[contact-logs/history] Server error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/contact-logs/history',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
