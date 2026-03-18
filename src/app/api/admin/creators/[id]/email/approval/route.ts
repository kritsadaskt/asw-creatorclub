import { NextRequest, NextResponse } from 'next/server';
import { getCreatorById } from '../../../../../../utils/storage';
import { buildApprovalEmailPayload } from '../../../../../../utils/email';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const creator = await getCreatorById(params.id);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const payload = buildApprovalEmailPayload(creator);

    // TODO: Implement actual SMTP send using your preferred library/server.
    // For now we just return the payload so you can inspect it in logs/dev tools.
    return NextResponse.json({ success: true, smtpPayload: { ...payload, password: undefined } });
  } catch (error) {
    console.error('Send approval email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

