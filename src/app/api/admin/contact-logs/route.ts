import { NextRequest, NextResponse } from 'next/server';
import { filterExcludedContactLogsResponse } from '@/lib/excluded-contact-log-leads';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { getServerSession } from '@/modules/utils/auth';

/**
 * GET /api/admin/contact-logs
 *
 * Fetches UTM customer registration logs from the external AssetWise CIS API.
 * Query Parameters:
 *  - utm_source (required)
 *  - utm_campaign (optional)
 *  - utm_medium (optional)
 */
export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const utmSource = searchParams.get('utm_source')?.trim();
    const utmCampaign = searchParams.get('utm_campaign')?.trim();
    const utmMedium = searchParams.get('utm_medium')?.trim();

    if (!utmSource) {
      return NextResponse.json({ error: 'Missing required parameter: utm_source' }, { status: 400 });
    }

    // Determine the CIS API endpoint based on UAT or Production environment settings
    let endpointUrl = 'https://api.assetwise.co.th/api/Customer/GetContactLogRegister';

    // Retrieve external authorization credentials
    const token = process.env.CONTACT_LOGS_TOKEN;
    const headers: Record<string, string> = { 
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Basic ${token}`;
    }

    const payloadBody: Record<string, string> = {
      utm_source: utmSource,
    };
    if (utmCampaign) {
      payloadBody.utm_campaign = utmCampaign;
    }
    if (utmMedium) {
      payloadBody.utm_medium = utmMedium;
    }

    // console.log(`[contact-logs] Fetching logs from: ${endpointUrl} (POST) with payload:`, payloadBody);

    const externalRes = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadBody)
    });

    const responseText = await externalRes.text();
    // console.log(`[contact-logs] Received status ${externalRes.status} from external API. Response:`, responseText);
    let responseData: unknown;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = { raw: responseText };
    }

    if (!externalRes.ok) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/contact-logs',
        severity: 'warn',
        message: `External CIS API returned status ${externalRes.status}`,
        context: {
          ...requestLogContext(request),
          targetUrl: endpointUrl,
          status: externalRes.status,
          responseBodySnippet: responseText.slice(0, 500),
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to fetch contact logs from external API',
          status: externalRes.status,
          details: responseData,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: filterExcludedContactLogsResponse(responseData),
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
