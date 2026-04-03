import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { sendEmail } from '@/lib/email/send-email';
import { buildRejectionEmailMessage } from '@/modules/utils/email';
import { getCreatorById } from '@/modules/utils/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const creator = await getCreatorById(id);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const message = buildRejectionEmailMessage(creator);
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

    if (result.reason === 'invalid_content') {
      return NextResponse.json({ error: 'INVALID_EMAIL_CONTENT' }, { status: 400 });
    }

    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/email/rejection',
      severity: 'warn',
      message: 'EMAIL_SEND_FAILED',
      context: { ...requestLogContext(request), creatorId: id },
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('Send rejection email error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/email/rejection',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
