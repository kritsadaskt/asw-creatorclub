import { NextRequest, NextResponse } from 'next/server';
import { fetchAllContactLogs, fetchCisContactLogRegister } from '@/lib/cis-contact-log-register';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

/**
 * GET /api/admin/contact-logs
 *
 * Default (no query): all CIS leads — no source / campaign / medium / name filters.
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

    const logs =
      !utmSource && !utmCampaign && !utmMedium
        ? await fetchAllContactLogs()
        : await fetchCisContactLogRegister({ utmSource, utmCampaign, utmMedium });

    if (logs == null) {
      return NextResponse.json(
        { error: 'Failed to fetch contact logs from external API' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: logs,
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
