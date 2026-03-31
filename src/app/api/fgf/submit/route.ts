import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createFgfLeadWithProjects } from '@/modules/utils/storage';
import { getSession } from '@/modules/utils/auth';

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

    const token = process.env.CIS_TOKEN?.trim();
    const cisHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      cisHeaders.Authorization = `Bearer ${token}`;
    }

    const cisPayload = {
      fgfLeadId:        leadId,
      referrerName:     data.referrerName,
      referrerLastName: data.referrerLastName,
      referrerEmail:    data.referrerEmail,
      referrerTel:      data.referrerTel,
      leadName:         data.leadName,
      leadLastName:     data.leadLastName,
      leadEmail:        data.leadEmail,
      leadTel:          data.leadTel,
      projectIds:       data.projectIds,
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
      }
    } catch (err) {
      cisError = { message: err instanceof Error ? err.message : String(err) };
    }

    if (cisError) {
      // Lead was saved; admin can re-push via /api/admin/fgf-leads/[id]/cis
      return NextResponse.json({ success: true, leadId, cisError });
    }

    return NextResponse.json({ success: true, leadId });
  } catch (error) {
    console.error('FGF submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
