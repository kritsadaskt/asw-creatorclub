import fgf_icon from '@/assets/fgf-img.webp'
import aff_icon from '@/assets/aff-img.webp'
import Image from 'next/image';
import Link from 'next/link';

export function CreatorTools() {
  return (
    <section id="creator_tools" className="relative bg-primary text-white pt-10 pb-10">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl lg:text-5xl font-medium text-center mb-2">เป็นครีเอเตอร์กับเราวันนี้</h3>
        <p className="text-center text-neutral-50 font-light text-base lg:text-xl">รับโอกาสในการเข้าถึงเครื่องมือสร้างรายได้<br className="block lg:hidden" />จากคอนเท้นของแอสเซทไวส์</p>
        <div className="h-10"></div>
        <div className="flex flex-col md:flex-row justify-center gap-7 max-w-6xl mx-auto">
          <div className="aff bg-gradient-to-br min-h-[250px] from-white to-orange-100 w-full md:w-1/2 rounded-lg p-7 shadow-lg relative overflow-hidden pb-[200px] lg:pb-0">
            <h4 className="text-3xl font-medium mb-2 text-primary">AFFILIATE PROGRAM</h4>
            <p className="text-black w-full lg:w-2/3">เลือกโปรโมท 36 โครงการจาก ASSETWISE ผ่านโซเชียลมีเดียเพื่อรับค่าคอมมิชชั่นง่าย ๆ
            เพียงแชร์ลิงก์หรือโพสต์คอนเทนต์ เมื่อมีการจองรับผลตอบแทนสูงสุดถึง 500,000 บาท*</p>
            <Image src={aff_icon} alt="AFFILIATE PROGRAM" width={500} height={500} className="absolute -bottom-[30%] left-0 lg:-bottom-[35%] lg:-right-[15%] lg:left-auto w-full lg:w-[320px] h-auto" />
            <div className="h-5"></div>
            <Link href="/affiliate" className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-md">ดูเพิ่มเติม</Link>
          </div>
          <div className="fgf bg-gradient-to-br min-h-[250px] from-white to-orange-100 w-full md:w-1/2 rounded-lg p-7 shadow-lg relative overflow-hidden pb-[200px] lg:pb-0">
            <h4 className="text-3xl font-medium mb-2 text-primary">FRIEND GET FRIENDS</h4>
            <p className="text-black w-2/3">ชวนเพื่อนมาเป็นเพื่อนบ้าน ในโครงการบ้านและคอนโดมิเนียมของ ASSETWISE รับค่าแนะนำสูงสุด 500,000 บ.*</p>
            <Image src={fgf_icon} alt="FRIEND GET FRIENDS" width={500} height={500} className="absolute -bottom-[30%] left-0 lg:-bottom-[35%] lg:-right-[15%] lg:left-auto w-full lg:w-[320px] h-auto" />
            <div className="h-5"></div>
            <Link href="/friendgetfriend" className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-md">ดูเพิ่มเติม</Link>
          </div>
        </div>
      </div>
    </section>
  );
}