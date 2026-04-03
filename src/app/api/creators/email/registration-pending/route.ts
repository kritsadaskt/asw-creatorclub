import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { sendEmail } from '@/lib/email/send-email';
import { buildRegistrationPendingEmailMessage } from '@/modules/utils/email';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { name?: string; email?: string };
    const name = body?.name?.trim();
    const email = body?.email?.trim();

    if (!name || !email) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const message = buildRegistrationPendingEmailMessage({ name, email });
    const result = await sendEmail({
      to: message.to,
      subject: message.subject,
      html: message.html,
    });

    if (result.sent) {
      return NextResponse.json({ success: true });
    }

    if (result.reason === 'not_configured') {
      return NextResponse.json({ success: true, dev: true });
    }

    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:creators/email/registration-pending',
      severity: 'warn',
      message: 'EMAIL_SEND_FAILED',
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('Send registration pending email error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:creators/email/registration-pending',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  }
}
