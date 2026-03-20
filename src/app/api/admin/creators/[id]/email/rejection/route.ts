import { NextRequest, NextResponse } from 'next/server';
import { getCreatorById } from '@/modules/utils/storage';
import { buildRejectionEmailPayload } from '@/modules/utils/email';

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

    const payload = buildRejectionEmailPayload(creator);

    return NextResponse.json({ success: true, smtpPayload: { ...payload, password: undefined } });
  } catch (error) {
    console.error('Send rejection email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
