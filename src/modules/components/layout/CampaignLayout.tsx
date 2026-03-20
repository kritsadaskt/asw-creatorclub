'use client';

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';
import { HeroBanner } from '../landing/HeroBanner';
import affDesktopBanner from '@/assets/aff_desktop_banner.jpg';
import affMobileBanner from '@/assets/aff_mobile_banner.jpg';

interface CampaignLayoutProps {
  children: ReactNode;
}

export function CampaignLayout({ children }: CampaignLayoutProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const handleLogin = (id: string, role: 'creator' | 'admin') => {
    setIsLoggedIn(true);

    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/profile');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner imageDesktop={affDesktopBanner} imageMobile={affMobileBanner} />
      <main className="flex-1 pt-6 pb-10">
        <div className="container mx-auto px-4 md:px-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

