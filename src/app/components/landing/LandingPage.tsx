import { Header } from './Header';
import { HeroBanner } from './HeroBanner';
import { IntroSection } from './IntroSection';
import { RegisterSection } from './RegisterSection';
import Footer from './Footer';

interface LandingPageProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <Header onLogin={onLogin} />
      <HeroBanner />
      <IntroSection />
      <RegisterSection onLogin={onLogin} />
      <Footer />
    </div>
  );
}
