'use client';

import { Header } from './Header';
import { HeroBanner } from './HeroBanner';
import { IntroSection } from './IntroSection';
import { RegisterSection } from './RegisterSection';
import Footer from './Footer';
import { useSession } from '@/modules/context/SessionContext';
import { CreatorTools } from './CreatorTools';

export function LandingPage() {
  const { handleLogin, currentUserId } = useSession();
  const isLoggedIn = !!currentUserId;

  return (
    <div className="min-h-screen">
      <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner />
      <IntroSection />
      <CreatorTools />
      {!isLoggedIn && <RegisterSection onLogin={handleLogin} />}
      <Footer />
    </div>
  );
}
