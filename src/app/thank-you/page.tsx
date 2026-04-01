import Link from 'next/link';
import { CheckCircle2, PhoneCall } from 'lucide-react';
import { Header } from '@/modules/components/landing/Header';
import Footer from '@/modules/components/landing/Footer';

export default function ThankYouPage() {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-gradient-to-b from-primary/10 to-primary/5 px-4 py-10 lg:px-0 lg:py-12">
        <section className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2 leading">ขอบคุณที่สนใจสมัครเข้าร่วม<br/><span className="text-primary">AssetWise CREATOR CLUB</span></h2>
          <p className="mt-3 text-muted-foreground">
            เนื่องจากปัจจุบันมีผู้สมัครเข้าร่วมเป็นจำนวนมาก<br/>
            ทางทีมงานจะดำเนินการพิจารณาและติดต่อกลับภายใน 7 วันทำการ<br/> หากท่านได้รับการคัดเลือกเข้าร่วมโปรแกรม<br/>
            ทีมงานจะตรวจสอบข้อมูลและแจ้งผลทางอีเมล
          </p>

          <hr className="my-5" />

          <p className="mt-3 text-muted-foreground">
            ท่านสามารถสอบถามข้อมูลเรื่อง AssetWise CREATOR CLUB ผ่านช่องทาง
          </p>
          <p className="mt-3 text-muted-foreground flex items-center gap-2 justify-center">
            <a href="https://line.me/" title="AssetWise Crator Club" className="flex items-center gap-2">
              <img src="https://assetwise.co.th/wp-content/uploads/2026/03/lineoa-icon.png" width={20} height={20} alt="AssetWise Crator Club" />
              <span>@AssetWiseCratorclub</span>
            </a>
            <a href="tel:021680000" title="ติดต่อ AssetWise" className="flex items-center gap-2">
              <img src="https://assetwise.co.th/wp-content/uploads/2026/03/tel-icon.png" width={20} height={20} alt="ติดต่อ AssetWise" />
              <span>02-168-0000</span>
            </a>
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              กลับหน้าหลัก
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-foreground font-medium hover:bg-accent hover:text-white transition-colors"
            >
              ไปที่โปรไฟล์
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
