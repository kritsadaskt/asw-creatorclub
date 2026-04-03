import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getCreatorById } from '@/modules/utils/storage';

type ApprovalStatus = 0 | 1 | 2 | 3;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const status: ApprovalStatus = body.status;

    if (![0, 1, 2, 3].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { id } = await params;
    const creator = await getCreatorById(id);
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ approval_status: status })
      .eq('id', id);

    if (error) {
      console.error('Error updating approval status:', error);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:admin/creators/[id]/approval',
        severity: 'error',
        error,
        context: { ...requestLogContext(request), creatorId: id },
      });
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approval status error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:admin/creators/[id]/approval',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
