import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { createFgfLeadWithProjects } from '@/modules/utils/storage';

const FgfSubmitSchema = z.object({
  referrerName:     z.string().min(1),
  referrerLastName: z.string().min(1),
  referrerEmail:    z.string().email(),
  referrerTel:      z.string().min(9),
  leadName:         z.string().min(1),
  leadLastName:     z.string().min(1),
  leadEmail:        z.string().email(),
  leadTel:          z.string().min(9),
  projectIds:       z.array(z.string().uuid()).min(1),
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

    // Read session cookie to attach refUid / referrerCreatorId
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

    const result = await createFgfLeadWithProjects({
      referrerName:     data.referrerName,
      referrerLastName: data.referrerLastName,
      referrerEmail:    data.referrerEmail,
      referrerTel:      data.referrerTel,
      refUid:           sessionUserId,
      referrerCreatorId: sessionUserId,
      leadName:         data.leadName,
      leadLastName:     data.leadLastName,
      leadEmail:        data.leadEmail,
      leadTel:          data.leadTel,
      projectIds:       data.projectIds,
    });

    const leadId = result.lead.id;

    // Determine CIS URL: UAT in non-production, PROD in production
    const cisUrl =
      process.env.NODE_ENV !== 'production'
        ? process.env.CIS_API_UAT?.trim()
        : process.env.CIS_API_PROD?.trim();

    if (!cisUrl) {
      return NextResponse.json(
        { success: true, leadId, cisError: { message: 'CIS endpoint not configured' } },
        { status: 200 },
      );
    }

    // ── CIS uses HTTP Basic Authentication (not Bearer) ──
    const token = process.env.CIS_TOKEN?.trim();
    const cisHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      cisHeaders.Authorization = `Basic ${token}`;
    }

    // ── Build CIS SaveOtherSource payload per API v15.0 spec ──
    // We send one request per project (CIS requires a single ProjectID per request).
    // We use the first project; the rest are logged in the Ref field for traceability.
    // Since our DB uses UUIDs and CIS expects int ProjectID, we generate a numeric RefID
    // from the lead's DB id and store our UUIDs in the Ref field for cross-referencing.
    const numericRefId = parseInt(leadId.replace(/-/g, '').slice(0, 8), 16);
    const now = formatCisDate(new Date());

    const cisPayload = {
      ProjectID:        0,                    // Default; CIS will route via Ref field
      ContactChannelID: 21,                   // Web Site (fixed per CIS spec)
      ContactTypeID:    35,                   // Register (fixed per CIS spec)
      RefID:            numericRefId,          // Numeric reference from our lead UUID
      Fname:            data.leadName,         // Lead's first name
      Lname:            data.leadLastName,     // Lead's last name
      Tel:              data.leadTel || 'NULL', // CIS requires "NULL" string if absent
      Email:            data.leadEmail || 'NULL',
      Ref:              `CreatorClub FGF | Referrer: ${data.referrerName} ${data.referrerLastName} (${data.referrerTel}) | Projects: ${data.projectIds.join(',')}`,
      RefDate:          now,
      FollowUpID:       42,                   // Yes (fixed per CIS spec)
      FlagPersonalAccept:  true,
      FlagContactAccept:   true,
      utm_source:       'creatorclub',
      utm_medium:       'referral',
      utm_campaign:     'friend_get_friend',
    };

    let cisError: unknown;
    try {
      const cisRes = await fetch(cisUrl, {
        method: 'POST',
        headers: cisHeaders,
        body: JSON.stringify(cisPayload),
      });

      if (!cisRes.ok) {
        const text = await cisRes.text();
        cisError = { status: cisRes.status, body: text };
      } else {
        // Parse CIS response to check Success flag
        const cisData = await cisRes.json().catch(() => null);
        if (cisData && cisData.Success === false) {
          cisError = { status: 200, body: cisData.Message || 'CIS returned Success: false' };
        }
      }
    } catch (err) {
      cisError = { message: err instanceof Error ? err.message : String(err) };
    }

    if (cisError) {
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:fgf/submit',
        severity: 'warn',
        message: 'CIS request failed after lead saved',
        context: {
          ...requestLogContext(request),
          leadId,
          cisError:
            typeof cisError === 'object'
              ? JSON.stringify(cisError).slice(0, 500)
              : String(cisError).slice(0, 500),
        },
      });
      // Lead was saved; admin can re-push via /api/admin/fgf-leads/[id]/cis
      return NextResponse.json({ success: true, leadId, cisError });
    }

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_LEAD') {
      return NextResponse.json(
        { error: 'มีการส่งข้อมูลนี้แล้วในช่วง 24 ชั่วโมงที่ผ่านมา' },
        { status: 409 },
      );
    }
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
