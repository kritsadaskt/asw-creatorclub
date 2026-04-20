import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { findLatestCreatorClubManualPdf } from '@/lib/find-latest-creator-club-manual-pdf';
import { sendEmail } from '@/lib/email/send-email';
import { buildApprovalEmailMessage } from '@/modules/utils/email';
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

    const message = buildApprovalEmailMessage(creator);

    const manual = await findLatestCreatorClubManualPdf();
    if (!manual) {
      console.warn(
        '[approval-email] No Creator Club manual PDF in public/ matching AssetWise_CreatorClub_Manual*.pdf — sending without attachment',
      );
    }

    const result = await sendEmail({
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: manual
        ? [
            {
              filename: manual.filename,
              path: manual.absolutePath,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
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
      source: 'api:admin/creators/[id]/email/approval',
      severity: 'warn',
      message: 'EMAIL_SEND_FAILED',
      context: { ...requestLogContext(request), creatorId: id },
    });
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  } catch (error) {
    console.error('Send approval email error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/email/approval',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
