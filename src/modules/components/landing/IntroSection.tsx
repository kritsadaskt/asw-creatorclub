import { CheckCircle, Users, TrendingUp, Link2, SquareCheckBig } from 'lucide-react';
import Image from 'next/image';
import creatorClubIcon from '@/assets/creator-img.webp';
import friendGetFriendsIcon from '@/assets/fgf-img.webp';
import affiliateProgramIcon from '@/assets/aff-img.webp';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useSession } from '@/modules/context/SessionContext';

export function IntroSection() {
  const { currentUserId } = useSession();
  const isLoggedIn = !!currentUserId;
  return (
    <>
      <section className="relative bg-gradient-to-b from-primary/5 to-primary/10 text-white py-12 md:pt-24 md:pb-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-7 lg:gap-0">
              <div className="featured_image">
                <Image
                  src={creatorClubIcon}
                  alt="Creator Club"
                  className="w-4/5 h-auto object-cover mx-auto mb-7"
                />
              </div>

              <div className="content">
                <h3 className='uppercase font-bold mb-2'><span className='text-primary text-5xl lg:text-7xl'>AssetWise</span><br/><span className='text-orange-500 text-4xl lg:text-6xl'>Creator Club</span></h3>
                <h3 className='text-3xl font-normal text-primary/70 mb-7'>Make content : Earn Commission</h3>
                <div className="detail text-neutral-600 text-lg">
                  <p>คอมมูนิตี้สำหรับคนรักการสร้างคอนเทนต์ ไม่ว่าคุณจะเป็น Creator สายรีวิว สายไลฟ์สไตล์ อินฟลูเอนเซอร์ หรือคนทั่วไปที่อยากเปลี่ยนไอเดียให้กลายเป็นรายได้ ที่นี่เปิดโอกาสให้คุณได้ สร้างรายได้จากการทำคอนเทนต์ร่วมกับแบรนด์อสังหาริมทรัพย์ชั้นนำ</p>
                  <div className="h-4"></div>
                  <ul className="text-left space-y-2">
                    <li className="flex">
                      <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เข้าร่วมกิจกรรมและแคมเปญพิเศษก่อนใคร</span></li>
                    <li className="flex">
                      <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เรียนรู้และอัปสกิลผ่าน Workshop จากผู้เชี่ยวชาญ</span></li>
                    <li className="flex">
                      <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เชื่อมต่อกับ Creator คนอื่น ๆ ใน Community ที่พร้อมเติบโตไปด้วยกัน</span></li>
                    <li className="flex">
                      <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>Creator Club ไม่ได้มองหาคนที่ &quot;ดังที่สุด&quot; แต่มองหาคนที่ &quot;เป็นตัวเองที่สุด&quot; และอยากเติบโตไปพร้อมกัน</span></li>
                  </ul>
                  {/* If user is not logged in, show the link */}
                  {!isLoggedIn && (
                    <div className='mt-7 flex justify-start gap-5'>
                      <a href="/#register-section" className='text-base lg:text-xl h-auto w-auto lg:w-[200px] block rounded-4xl bg-gradient-to-br from-orange-400 to-orange-600 text-white px-7 py-4 leading-none text-center cursor-pointer'>สมัครเข้าร่วม</a>
                      <a href="/#register-section" className='text-base lg:text-xl h-auto w-auto lg:w-[200px] block rounded-4xl border-2 border-orange-600 text-orange-600 px-7 py-4 leading-none text-center cursor-pointer'>ข้อมูลเพิ่มเติม</a>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          </div>
      </section>
    </>
  );
}