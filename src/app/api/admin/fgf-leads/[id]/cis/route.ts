import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';

/**
 * Proxies Friend Get Friends lead payload to AssetWise CIS (SaveOtherSource).
 * Configure CIS_API_UAT or CIS_API_PROD and optional CIS_TOKEN in env.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fgfLeadId } = await params;
    if (!fgfLeadId) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { payload?: unknown };
    const payload = body.payload;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'JSON body must include a "payload" object' }, { status: 400 });
    }

    const nested = payload as { fgfLeadId?: string };
    if (nested.fgfLeadId !== undefined && nested.fgfLeadId !== fgfLeadId) {
      return NextResponse.json({ error: 'fgfLeadId does not match URL' }, { status: 400 });
    }

    const cisUrl =
      process.env.CIS_API_UAT?.trim() ||
      process.env.CIS_API_PROD?.trim() ||
      process.env.NEXT_PUBLIC_CIS_UAT?.trim();

    if (!cisUrl) {
      return NextResponse.json(
        { error: 'CIS endpoint not configured (set CIS_API_UAT or CIS_API_PROD)' },
        { status: 503 },
      );
    }

    const token = process.env.CIS_TOKEN?.trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const cisRes = await fetch(cisUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await cisRes.text();
    let cisJson: unknown;
    try {
      cisJson = JSON.parse(text) as unknown;
    } catch {
      cisJson = { raw: text };
    }

    if (!cisRes.ok) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/fgf-leads/[id]/cis',
        severity: 'warn',
        message: `CIS upstream ${cisRes.status}`,
        context: {
          ...requestLogContext(request),
          cisStatus: cisRes.status,
          cisBodySnippet:
            typeof cisJson === 'object'
              ? JSON.stringify(cisJson).slice(0, 500)
              : String(cisJson).slice(0, 500),
        },
      });
      return NextResponse.json(
        { error: 'CIS request failed', cisStatus: cisRes.status, cisBody: cisJson },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, cis: cisJson });
  } catch (error) {
    console.error('FGF CIS proxy error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/fgf-leads/[id]/cis',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
