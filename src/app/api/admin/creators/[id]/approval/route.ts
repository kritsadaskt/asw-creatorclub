import { NextRequest, NextResponse } from 'next/server';
import { getCreatorById } from '@/modules/utils/storage';
import { supabase } from '@/modules/utils/supabase';

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

    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: status })
      .eq('id', id);

    if (error) {
      console.error('Error updating approval status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approval status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
