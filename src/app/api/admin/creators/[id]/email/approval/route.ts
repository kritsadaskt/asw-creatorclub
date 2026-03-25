import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send-email';
import { buildApprovalEmailMessage } from '@/modules/utils/email';
import { getCreatorById } from '@/modules/utils/storage';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const creator = await getCreatorById(id);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const message = buildApprovalEmailMessage(creator);
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

    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('Send approval email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
