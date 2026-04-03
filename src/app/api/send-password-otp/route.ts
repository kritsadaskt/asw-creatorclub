import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { sendEmail } from '@/lib/email/send-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email as string | undefined;
    const otp = body?.otp as string | undefined;

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await sendEmail({
      to: email,
      subject: 'รหัสยืนยันกู้คืนรหัสผ่าน — Creator Club',
      text: `รหัสยืนยันของคุณคือ ${otp} (หมดอายุใน 10 นาที)`,
      html: `<p>รหัสยืนยันของคุณคือ <strong>${otp}</strong></p><p>รหัสหมดอายุใน 10 นาที</p>`,
    });

    if (result.sent) {
      return NextResponse.json({ success: true });
    }

    if (result.reason === 'not_configured') {
      console.warn(
        '[send-password-otp] SMTP not configured; set SMTP_HOST, SMTP_USER/SMTP_USERNAME, SMTP_PASS/SMTP_PASSWORD, SMTP_FROM/SMTP_FROM_ADDRESS. OTP for',
        email,
        ':',
        otp,
      );
      return NextResponse.json({ success: true, dev: true });
    }

    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:send-password-otp',
      severity: 'warn',
      message: 'EMAIL_SEND_FAILED (SMTP)',
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('[send-password-otp]', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:send-password-otp',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  }
}
