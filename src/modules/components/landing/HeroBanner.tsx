import type { StaticImageData } from 'next/image';
import Image from 'next/image';

import desktopBanner from '@/assets/creator-club_desktop-banner.jpg';
import mobileBanner from '@/assets/creator-club_mobile-banner.jpg';

export type HeroBannerImage = StaticImageData | string;

export interface HeroBannerProps {
  imageDesktop?: HeroBannerImage;
  imageMobile?: HeroBannerImage;
  altDesktop?: string;
  altMobile?: string;
}

export function HeroBanner({
  imageDesktop = desktopBanner,
  imageMobile = mobileBanner,
  altDesktop = 'Hero Banner',
  altMobile = 'Hero Banner',
}: HeroBannerProps) {
  return (
    <>
      {typeof imageDesktop === 'string' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageDesktop}
          alt={altDesktop}
          className="w-full h-full object-cover hidden md:block"
        />
      ) : (
        <Image
          src={imageDesktop}
          alt={altDesktop}
          className="w-full h-full object-cover hidden md:block"
          priority
        />
      )}
      {typeof imageMobile === 'string' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageMobile}
          alt={altMobile}
          className="w-full h-full object-cover block md:hidden"
        />
      ) : (
        <Image
          src={imageMobile}
          alt={altMobile}
          className="w-full h-full object-cover block md:hidden"
          priority
        />
      )}
    </>
  );
}