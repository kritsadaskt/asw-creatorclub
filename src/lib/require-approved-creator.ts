import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  creatorApprovalBlockMessage,
  isCreatorApproved,
  isCreatorLoginAllowed,
  parseCreatorApprovalStatus,
  type CreatorApprovalStatus,
} from '@/lib/creator-approval';
import type { SessionData } from '@/modules/utils/auth';
import { getServerSession } from '@/modules/utils/auth';

export async function getCreatorApprovalStatus(creatorId: string): Promise<CreatorApprovalStatus | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('approval_status')
    .eq('id', creatorId)
    .maybeSingle();

  if (error || !data) return null;
  return parseCreatorApprovalStatus(data.approval_status) ?? 3;
}

export async function requireCreatorSession(
  request: NextRequest,
): Promise<
  | { ok: true; session: SessionData; approvalStatus: CreatorApprovalStatus }
  | { ok: false; response: NextResponse }
> {
  const session = getServerSession(request);
  if (!session || session.role !== 'creator') {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const approvalStatus = await getCreatorApprovalStatus(session.id);
  if (approvalStatus === null) {
    return { ok: false, response: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) };
  }

  if (!isCreatorLoginAllowed(approvalStatus)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: creatorApprovalBlockMessage(approvalStatus) },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session, approvalStatus };
}

export async function requireApprovedCreatorSession(
  request: NextRequest,
): Promise<
  | { ok: true; session: SessionData & { approvalStatus: 1 } }
  | { ok: false; response: NextResponse }
> {
  const result = await requireCreatorSession(request);
  if (!result.ok) return result;

  if (!isCreatorApproved(result.approvalStatus)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Creator not approved' }, { status: 403 }),
    };
  }

  return { ok: true, session: { ...result.session, approvalStatus: 1 } };
}
