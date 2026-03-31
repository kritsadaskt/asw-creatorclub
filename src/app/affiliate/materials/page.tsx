'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/modules/context/SessionContext';
import { getCreatorById } from '@/modules/utils/storage';
import { AffiliateMaterialsGallery } from '@/modules/components/affiliate/AffiliateMaterialsGallery';

export default function AffiliateMaterialsPage() {
  const { currentUserId, userRole } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!currentUserId || userRole !== 'creator') {
      router.replace('/profile');
      return;
    }

    getCreatorById(currentUserId)
      .then((profile) => {
        if (!profile || profile.approvalStatus !== 1) {
          router.replace('/profile');
        } else {
          setApproved(true);
        }
      })
      .catch(() => router.replace('/profile'))
      .finally(() => setChecking(false));
  }, [currentUserId, userRole, router]);

  if (checking || !approved) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return <AffiliateMaterialsGallery />;
}
