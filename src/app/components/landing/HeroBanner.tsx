import heroBannerImg from '@/assets/creator-club_desktop-banner.jpg'
import heroBannerImgMobile from '@/assets/creator-club_mobile-banner.jpg'

export function HeroBanner() {
  return (
    <>
      <img src={heroBannerImg} alt="Hero Banner" className="w-full h-full object-cover hidden md:block" />
      <img src={heroBannerImgMobile} alt="Hero Banner" className="w-full h-full object-cover block md:hidden" />
    </>
  );
}