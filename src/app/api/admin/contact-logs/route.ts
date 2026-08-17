import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllContactLogs,
  fetchCisContactLogRegisterResultWithRetry,
} from '@/lib/cis-contact-log-register';
import { filterExcludedContactLogLeads } from '@/lib/excluded-contact-log-leads';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

/** CIS may run two parallel source fetches — allow enough time on Vercel. */
export const maxDuration = 60;

/**
 * GET /api/admin/contact-logs
 *
 * Default (no query): merged leads from utm_source creator_club_affiliate + creatorclub.
 * Optional query params for ad-hoc lookup: utm_source, utm_campaign, utm_medium.
 */
export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const utmSource = searchParams.get('utm_source')?.trim() || undefined;
    const utmCampaign = searchParams.get('utm_campaign')?.trim() || undefined;
    const utmMedium = searchParams.get('utm_medium')?.trim() || undefined;

    const result =
      !utmSource && !utmCampaign && !utmMedium
        ? await fetchAllContactLogs()
        : await fetchCisContactLogRegisterResultWithRetry({ utmSource, utmCampaign, utmMedium });

    if (!result.ok) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/contact-logs',
        severity: 'warn',
        message: result.reason,
        context: {
          ...requestLogContext(request),
          cisStatus: result.status ?? null,
          utmSource: utmSource ?? null,
          utmCampaign: utmCampaign ?? null,
          utmMedium: utmMedium ?? null,
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch contact logs from external API',
          detail: result.reason,
          status: result.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: filterExcludedContactLogLeads(result.data),
    });
  } catch (error) {
    console.error('[contact-logs] Server error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/contact-logs',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
