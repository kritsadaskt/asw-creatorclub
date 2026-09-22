'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';
import { HeroBanner, type HeroBannerImage } from '../landing/HeroBanner';
import affDesktopBanner from '@/assets/aff_desktop_banner_rv1.jpg';
import affMobileBanner from '@/assets/aff_mobile_banner_rv1.jpg';
import { getCampaignByKey } from '@/modules/utils/storage';
import { useSession } from '@/modules/context/SessionContext';

interface CampaignLayoutProps {
  children: ReactNode;
  campaignKey?: string;
}

export function CampaignLayout({ children, campaignKey }: CampaignLayoutProps) {
  const { handleLogin: sessionLogin, currentUserId } = useSession();
  const [desktopBanner, setDesktopBanner] = useState<HeroBannerImage>(affDesktopBanner);
  const [mobileBanner, setMobileBanner] = useState<HeroBannerImage>(affMobileBanner);

  useEffect(() => {
    if (!campaignKey) return;
    getCampaignByKey(campaignKey).then((campaign) => {
      if (!campaign) return;
      if (campaign.bannerDesktopUrl) setDesktopBanner(campaign.bannerDesktopUrl);
      if (campaign.bannerMobileUrl) setMobileBanner(campaign.bannerMobileUrl);
    }).catch(() => {});
  }, [campaignKey]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      <Header onLogin={sessionLogin} isLoggedInFromParent={!!currentUserId} />
      <HeroBanner imageDesktop={desktopBanner} imageMobile={mobileBanner} />
      <main className="flex-1 pt-6 pb-10">
        <div className="container mx-auto px-4 md:px-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
