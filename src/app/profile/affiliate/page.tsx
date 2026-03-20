'use client';

import { AffiliateGenerator } from '@/modules/components/creator/AffiliateGenerator';
import { useSession } from '@/modules/context/SessionContext';

export default function ProfileAffiliatePage() {
  const { currentUserId } = useSession();
  if (!currentUserId) {
    return (
      <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>
    );
  }
  return <AffiliateGenerator creatorId={currentUserId} />;
}
