import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logServerError, requestLogContext } from '@/lib/log-server-error';

const FgfSubmitSchema = z.object({
  referrerName:     z.string().min(1),
  referrerLastName: z.string().min(1),
  referrerEmail:    z.string().email(),
  referrerTel:      z.string().min(9),
  leadName:         z.string().min(1),
  leadLastName:     z.string().min(1),
  leadEmail:        z.string().email(),
  leadTel:          z.string().min(9),
  /** CIS ProjectID (`projects.cis_id`) */
  cisId:            z.number().int().positive(),
});

/**
 * Format a Date to CIS-required format: "YYYY-MM-DD HH:mm:ss"
 */
function formatCisDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = FgfSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const cisUrl = process.env.CIS_API_PROD?.trim();
    if (!cisUrl) {
      return NextResponse.json(
        { error: 'CIS endpoint not configured (CIS_API_PROD)' },
        { status: 503 },
      );
    }

    // Read session cookie for Ref tracing only (not persisted)
    const sessionCookie = request.cookies.get('asw_session')?.value;
    let sessionUserId: string | undefined;
    if (sessionCookie) {
      try {
        const decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as { id?: string };
        sessionUserId = decoded.id;
      } catch {
        // ignore malformed session
      }
    }

    const token = process.env.CIS_TOKEN?.trim();
    const cisHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      cisHeaders.Authorization = `Basic ${token}`;
    }

    const numericRefId = randomInt(1, 0x7fffffff);
    const now = formatCisDate(new Date());
    const cisProjectId = data.cisId;
    const refBase = [
      'CreatorClub FGF',
      `Referrer: ${data.referrerName} ${data.referrerLastName} (${data.referrerTel})`,
      `CIS ProjectID: ${cisProjectId}`,
      sessionUserId ? `Creator session: ${sessionUserId}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const cisPayload = {
      ProjectID:          cisProjectId,
      ContactChannelID: 21,
      ContactTypeID:    179,
      RefID:            numericRefId,
      Fname:            data.leadName,
      Lname:            data.leadLastName,
      Tel:              data.leadTel || 'NULL',
      Email:            data.leadEmail || 'NULL',
      Ref:              refBase,
      RefDate:          now,
      FollowUpID:       42,
      FlagPersonalAccept: true,
      FlagContactAccept:  true,
      utm_source:       'creatorclub',
      utm_medium:       'referral',
      utm_campaign:     'friend_get_friend',
    };

    console.log('[fgf/submit] CIS request', { url: cisUrl, payload: cisPayload });

    const cisRes = await fetch(cisUrl, {
      method: 'POST',
      headers: cisHeaders,
      body: JSON.stringify(cisPayload),
    });

    const responseText = await cisRes.text();
    let responseJson: unknown = null;
    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      // body not JSON
    }

    console.log('[fgf/submit] CIS response', {
      status: cisRes.status,
      statusText: cisRes.statusText,
      ok: cisRes.ok,
      bodyRaw: responseText,
      bodyJson: responseJson,
    });

    if (!cisRes.ok) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:fgf/submit',
        severity: 'warn',
        message: 'CIS request failed',
        context: {
          ...requestLogContext(request),
          status: cisRes.status,
          body: responseText.slice(0, 500),
        },
      });
      return NextResponse.json(
        {
          error: 'ส่งข้อมูลไปยังระบบ CIS ไม่สำเร็จ',
          cisStatus: cisRes.status,
          cisBody: responseJson ?? responseText,
        },
        { status: 502 },
      );
    }

    if (
      responseJson &&
      typeof responseJson === 'object' &&
      'Success' in responseJson &&
      (responseJson as { Success?: boolean }).Success === false
    ) {
      const msg = (responseJson as { Message?: string }).Message || 'CIS returned Success: false';
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:fgf/submit',
        severity: 'warn',
        message: 'CIS returned Success: false',
        context: {
          ...requestLogContext(request),
          cisMessage: msg,
          body: responseText.slice(0, 500),
        },
      });
      return NextResponse.json(
        { error: msg, cisBody: responseJson },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, cis: responseJson ?? responseText });
  } catch (error) {
    console.error('FGF submit error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:fgf/submit',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
