import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/send-email';
import { logServerError, requestLogContext } from '@/lib/log-server-error';

const ReportProblemsSchema = z.object({
  fullName: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  phone: z.string().trim().min(9, 'เบอร์โทรไม่ถูกต้อง'),
  problem: z.string().trim().min(1, 'กรุณาระบุปัญหาที่พบ'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const parsed = ReportProblemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const result = await sendEmail({
      to: 'CreatorClub@assetwise.co.th',
      subject: '[Creator Club] แจ้งปัญหาการใช้งาน',
      text: `มีผู้ใช้งานแจ้งปัญหา\n\nชื่อ-นามสกุล: ${data.fullName}\nอีเมล: ${data.email}\nเบอร์โทร: ${data.phone}\n\nปัญหาที่พบ:\n${data.problem}`,
      html: `
        <p>มีผู้ใช้งานแจ้งปัญหา</p>
        <p><strong>ชื่อ-นามสกุล:</strong> ${data.fullName}</p>
        <p><strong>อีเมล:</strong> ${data.email}</p>
        <p><strong>เบอร์โทร:</strong> ${data.phone}</p>
        <p><strong>ปัญหาที่พบ:</strong></p>
        <p>${data.problem.replace(/\n/g, '<br />')}</p>
      `,
      replyTo: data.email,
    });

    if (result.sent) {
      return NextResponse.json({ success: true });
    }

    if (result.reason === 'not_configured') {
      return NextResponse.json({ success: true, dev: true });
    }

    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:report-problems',
      severity: 'warn',
      message: 'EMAIL_SEND_FAILED',
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('[report-problems]', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:report-problems',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  }
}
