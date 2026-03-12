import { CheckCircle, Users, TrendingUp, Link2, SquareCheckBig } from 'lucide-react';
import creatorClubIcon from '@/assets/creator-img.webp';
import friendGetFriendsIcon from '@/assets/fgf-img.webp';
import affiliateProgramIcon from '@/assets/aff-img.webp';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

export function IntroSection() {
  return (
    <>
    <section className="relative bg-gradient-to-br from-primary to-primary/80 text-white pt-24 pb-16">
      <div className="container mx-auto px-6">
        <h3 className='text-center w-full lg:w-3/4 mx-auto lg:text-4xl text-[1.75rem] font-normal uppercase mb-12 leading-normal'>3 โปรแกรมจาก AssetWise ที่จะช่วยคุณสร้างรายได้<br/>พร้อมอัพเกรดสกิลให้พร้อมสำหรับการสร้างคอนเทนต์</h3>
        <div className="grid md:grid-cols-3 gap-7 lg:gap-0">
          <div className='lg:pr-7 pr-0 flex flex-col justify-between gap-12'>
            <div className="content">
              <img src={creatorClubIcon} alt="Creator Club" className="w-4/5 h-auto object-cover mx-auto mb-7" />
              <h3 className="text-4xl uppercase text-center font-medium mb-7">Creator Club</h3>
              <div className="detail text-white font-light text-lg">
                <p>คอมมูนิตี้สำหรับคนรักการสร้างคอนเทนต์ ไม่ว่าคุณจะเป็น Creator สายรีวิว สายไลฟ์สไตล์ อินฟลูเอนเซอร์ หรือคนทั่วไปที่อยากเปลี่ยนไอเดียให้กลายเป็นรายได้ ที่นี่เปิดโอกาสให้คุณได้ สร้างรายได้จากการทำคอนเทนต์ร่วมกับแบรนด์อสังหาริมทรัพย์ชั้นนำ</p>
                <div className="h-4"></div>
                <ul className="text-left lg:text-xl text-base space-y-2">
                  <li className="flex">
                    <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เข้าร่วมกิจกรรมและแคมเปญพิเศษก่อนใคร</span></li>
                  <li className="flex">
                    <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เรียนรู้และอัปสกิลผ่าน Workshop จากผู้เชี่ยวชาญ</span></li>
                  <li className="flex">
                    <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>เชื่อมต่อกับ Creator คนอื่น ๆ ใน Community ที่พร้อมเติบโตไปด้วยกัน</span></li>
                  <li className="flex">
                    <SquareCheckBig className="w-6 h-6 inline-block mr-2 flex-shrink-0 text-orange-400" /><span>Creator Club ไม่ได้มองหาคนที่ "ดังที่สุด" แต่มองหาคนที่ "เป็นตัวเองที่สุด" และอยากเติบโตไปพร้อมกัน</span></li>
                </ul>
              </div>
            </div>
            <a href="/#register-section" className='text-2xl h-auto w-[220px] block mx-auto rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-7 py-4 leading-none text-center cursor-pointer'>สมัครเข้าร่วม</a>
          </div>

          <div className='lg:px-7 px-0 lg:border-x border-white/90 flex flex-col justify-between'>
            <div className="content">
              <img src={friendGetFriendsIcon} alt="Friend Get Friends" className="w-4/5 h-auto object-cover mx-auto mb-7" />
              <h3 className="text-4xl uppercase text-center font-medium mb-7">FRIEND GET FRIENDS</h3>
              <div className="detail text-white font-light text-lg">
                <p>โปรแกรมที่ชวนคุณส่งต่อสิ่งดีๆ ได้ง่ายๆ เพียงสมัครเข้ามาเป็นส่วนหนึ่งของ ASSETWISE FAMILY และชวนเพื่อนมาเป็นเพื่อนบ้านในโครงการบ้านและคอนโดมิเนียมของ ASSETWISE รับค่าแนะนำสูงสุด 300,000 บ.*</p>
                </div>
            </div>
            <a href="/friendgetfriend" className='text-2xl h-auto w-[220px] block mx-auto rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-7 py-4 leading-none text-center cursor-pointer'>สมัครเข้าร่วม</a>
          </div>

          <div className='lg:pl-7 pl-0 flex flex-col justify-between'>
            <div className="content">
              <img src={affiliateProgramIcon} alt="Affiliate Program" className="w-4/5 h-auto object-cover mx-auto mb-7" />
              <h3 className="text-4xl uppercase text-center font-medium">Affiliate Program</h3>
              <p className="text-center text-xl text-white/80 mb-7">โพสต์ง่ายๆ รายได้ปัง</p>
              <div className="detail text-white font-light text-lg">
                <h4 className="text-2xl font-medium mb-4">AFFILIATE PROGRAM คืออะไร ?</h4>
                <p>คือโปรแกรมที่จะช่วยให้คุณสร้างรายได้ ง่ายๆ เพียงสมัครเข้าร่วมกับ ASSETWISE AFFILIATE จากนั้นเลือกโครงการที่ต้องการโปรโมทกว่า 34 โครงการ เพียงแชร์ Link, โพส Content ไปยังช่องทางออนไลน์ต่าง ๆ เช่น Facebook, TikTok, Instagram, X, Youtube รับค่าคอมมิชชั่น เมื่อมีการจองผ่าน Link ของคุณ ทุกยอดขายคุณจะได้รับผลตอบแทนจาก ASSETWISE สูงสุด XXX,000 บาท*</p>
              </div>
            </div>
            <a href="/affiliate" className='text-2xl h-auto w-[220px] block mx-auto rounded-md bg-gradient-to-br from-orange-400 to-orange-600 px-7 py-4 leading-none text-center cursor-pointer'>สมัครเข้าร่วม</a>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}