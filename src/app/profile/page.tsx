'use client';

import { CreatorProfile } from '@/modules/components/creator/CreatorProfile';
import { useSession } from '@/modules/context/SessionContext';

export default function ProfilePage() {
  const { currentUserId } = useSession();
  if (!currentUserId) {
    return (
      <div className="p-8 text-center text-muted-foreground">กำลังโหลด...</div>
    );
  }
  return <CreatorProfile creatorId={currentUserId} />;
}
