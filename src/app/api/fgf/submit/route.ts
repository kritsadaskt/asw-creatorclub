import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

function isUuid(value: string | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractCisIds(
  payload: unknown,
): { contactLogId: number | null; customerId: number | null } {
  if (!payload || typeof payload !== 'object') {
    return { contactLogId: null, customerId: null };
  }

  const data = (payload as { Data?: unknown }).Data;
  if (!data || typeof data !== 'object') {
    return { contactLogId: null, customerId: null };
  }

  const rawContactLogId = (data as { ContactLogID?: unknown }).ContactLogID;
  const rawCustomerId = (data as { CustomerID?: unknown }).CustomerID;

  const contactLogId =
    typeof rawContactLogId === 'number' && Number.isFinite(rawContactLogId)
      ? rawContactLogId
      : null;
  const customerId =
    typeof rawCustomerId === 'number' && Number.isFinite(rawCustomerId)
      ? rawCustomerId
      : null;

  return { contactLogId, customerId };
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
    const { data: projectRow, error: projectResolveError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('cis_id', cisProjectId)
      .maybeSingle();
    if (projectResolveError) {
      console.warn('[fgf/submit] Failed to resolve project by cis_id:', projectResolveError);
    }
    const resolvedProjectId = typeof projectRow?.id === 'string' ? projectRow.id : null;
    const refCreatorId = isUuid(sessionUserId) ? sessionUserId : null;

    const { data: insertedLead, error: insertLeadError } = await supabaseAdmin
      .from('fgf_leads')
      .insert({
        referrer_name: data.referrerName,
        referrer_last_name: data.referrerLastName,
        referrer_email: data.referrerEmail,
        referrer_tel: data.referrerTel,
        ref_uid: sessionUserId ?? null,
        referrer_creator_id: refCreatorId,
        lead_name: data.leadName,
        lead_last_name: data.leadLastName,
        lead_email: data.leadEmail,
        lead_tel: data.leadTel,
        status: 'verified',
        chosen_project_id: resolvedProjectId,
      })
      .select('id')
      .single();

    if (insertLeadError || !insertedLead?.id) {
      console.error('[fgf/submit] Failed to insert fgf_leads row:', insertLeadError);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:fgf/submit',
        severity: 'error',
        message: 'FGF_LEAD_INSERT_FAILED',
        context: {
          ...requestLogContext(request),
          cisId: cisProjectId,
        },
      });
      return NextResponse.json({ error: 'ไม่สามารถบันทึกข้อมูลลีดได้' }, { status: 500 });
    }

    if (resolvedProjectId) {
      const { error: linkProjectError } = await supabaseAdmin
        .from('fgf_lead_projects')
        .insert({
          fgf_lead_id: insertedLead.id,
          project_id: resolvedProjectId,
        });
      if (linkProjectError) {
        console.error('[fgf/submit] Failed to insert fgf_lead_projects row:', linkProjectError);
      }
    }

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
      await supabaseAdmin
        .from('fgf_leads')
        .update({
          status: 'verified',
          crm_response: responseJson ?? responseText,
        })
        .eq('id', insertedLead.id);
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
      await supabaseAdmin
        .from('fgf_leads')
        .update({
          status: 'verified',
          crm_response: responseJson ?? responseText,
        })
        .eq('id', insertedLead.id);
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

    const cisIds = extractCisIds(responseJson);

    await supabaseAdmin
      .from('fgf_leads')
      .update({
        status: 'uploaded',
        uploaded_to_crm: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: refCreatorId,
        crm_response: responseJson ?? responseText,
        cis_contactLogID: cisIds.contactLogId,
        cis_customerID: cisIds.customerId,
      })
      .eq('id', insertedLead.id);

    return NextResponse.json({ success: true, cis: responseJson ?? responseText, fgfLeadId: insertedLead.id });
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
