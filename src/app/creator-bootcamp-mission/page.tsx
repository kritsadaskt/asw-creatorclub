import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CreatorBootupMissionPage } from '@/modules/components/event/CreatorBootupMissionPage';

export const metadata: Metadata = {
  title: 'Creators Bootcamp Mission',
};

export default function CreatorBootcampMissionRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          กำลังโหลด...
        </div>
      }
    >
      <CreatorBootupMissionPage />
    </Suspense>
  );
}
