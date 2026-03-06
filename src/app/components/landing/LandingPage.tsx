import { Header } from './Header';
import { HeroBanner } from './HeroBanner';
import { IntroSection } from './IntroSection';
import { RegisterSection } from './RegisterSection';
import Footer from './Footer';

interface LandingPageProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
  isLoggedIn?: boolean;
}

export function LandingPage({ onLogin, isLoggedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <Header onLogin={onLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner />
      <IntroSection />
      {!isLoggedIn && <RegisterSection onLogin={onLogin} />}
      <Footer />
    </div>
  );
}
