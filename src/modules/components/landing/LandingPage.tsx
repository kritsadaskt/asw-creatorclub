'use client';

import { useEffect } from 'react';
import { Header } from './Header';
import { HeroBanner } from './HeroBanner';
import { IntroSection } from './IntroSection';
import { RegisterSection } from './RegisterSection';
import Footer from './Footer';
import { useSession } from '@/modules/context/SessionContext';
import { CreatorTools } from './CreatorTools';
import { VideosSection } from './VideosSection';

export function LandingPage() {
  const { handleLogin, currentUserId, sessionReady } = useSession();
  const isLoggedIn = !!currentUserId;

  useEffect(() => {
    if (!sessionReady || isLoggedIn) return;
    if (window.location.hash !== '#register-section') return;

    const section = document.getElementById('register-section');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sessionReady, isLoggedIn]);

  return (
    <div className="min-h-screen">
      <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner />
      <IntroSection />
      <CreatorTools />
      <VideosSection />
      {!isLoggedIn && <RegisterSection onLogin={handleLogin} />}
      <Footer />
    </div>
  );
}
