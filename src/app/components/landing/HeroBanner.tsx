import { Users, TrendingUp, Link2 } from 'lucide-react';

export function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-br from-primary to-primary/80 text-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            AssetWise Creators Club
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            เชื่อมโยงผู้สร้างสรรค์คอนเทนต์กับโครงการอสังหาริมทรัพย์ชั้นนำ
            <br />
            สร้างรายได้และเติบโตไปด้วยกัน
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/15 transition-colors">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">เข้าร่วมได้ง่าย</h3>
            <p className="text-white/80">
              สร้างโปรไฟล์และแชร์ผลงานของคุณกับแบรนด์ชั้นนำ
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/15 transition-colors">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">โอกาสใหม่ๆ</h3>
            <p className="text-white/80">
              เข้าถึงโครงการคุณภาพและสร้างรายได้ที่คุ้มค่า
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/15 transition-colors">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">ติดตามผลได้</h3>
            <p className="text-white/80">
              สร้างลิงค์พิเศษและติดตามผลงานของคุณได้แบบเรียลไทม์
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}