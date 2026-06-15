import { NextRequest, NextResponse } from 'next/server';
import {
  creatorApprovalBlockMessage,
  isCreatorApproved,
  isCreatorLoginAllowed,
} from '@/lib/creator-approval';
import { getCreatorApprovalStatus } from '@/lib/require-approved-creator';
import { getServerSession } from '@/modules/utils/auth';

export async function GET(request: NextRequest) {
  const session = getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'creator') {
    return NextResponse.json({
      id: session.id,
      role: session.role,
      approvalStatus: null,
      canLogin: true,
      canAccessCreatorDashboard: true,
      canGenerateAffiliateLink: true,
    });
  }

  const approvalStatus = await getCreatorApprovalStatus(session.id);
  if (approvalStatus === null) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const canLogin = isCreatorLoginAllowed(approvalStatus);
  const approved = isCreatorApproved(approvalStatus);

  return NextResponse.json({
    id: session.id,
    role: session.role,
    approvalStatus,
    canLogin,
    canAccessCreatorDashboard: approved,
    canGenerateAffiliateLink: approved,
    blockMessage: approved ? null : creatorApprovalBlockMessage(approvalStatus),
  });
}
