'use client';

import Link from 'next/link';
import { useSession } from '@/modules/context/SessionContext';
import { Header } from './Header';
import { RegisterSection } from './RegisterSection';
import { HeroBanner } from './HeroBanner';

export function InvitedRegisterPage({
  inviteLabels,
  inviteType,
}: {
  inviteLabels: string[] | null;
  inviteType: string | null;
}) {
  const categoryLabels = inviteLabels;
  const { handleLogin, currentUserId } = useSession();
  const isLoggedIn = !!currentUserId;

  if (!categoryLabels?.length) {
    return (
      <div className="min-h-screen bg-primary/10">
        <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
        <section className="py-16 px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-lg font-semibold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground text-sm mt-3">
              This page is not available.
            </p>
            <Link
              href="/"
              className="inline-block mt-6 text-primary font-medium hover:underline"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-primary/10">
        <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
        <section className="py-16 px-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <p className="text-foreground">คุณเข้าสู่ระบบอยู่แล้ว</p>
            <Link href="/profile" className="inline-block mt-4 text-primary font-medium hover:underline">
              ไปที่โปรไฟล์
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary/10">
      <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner />
      <RegisterSection
        onLogin={handleLogin}
        fixedCategoryLabels={categoryLabels}
        inviteType={inviteType ?? undefined}
        variant="standalone"
      />
    </div>
  );
}
