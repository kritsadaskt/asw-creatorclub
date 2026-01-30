import { CheckCircle } from 'lucide-react';

export function IntroSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-primary mb-4">
            ทำไมต้อง AssetWise Creators Club
          </h2>
          <p className="text-lg text-muted-foreground">
            แพลตฟอร์มที่ออกแบบมาเพื่อเชื่อมโยงผู้สร้างสรรค์คอนเทนต์
            กับโครงการอสังหาริมทรัพย์คุณภาพ พร้อมเครื่องมือที่ช่วยให้คุณทำงานได้อย่างมืออาชีพ
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">สำหรับ Creators</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  สร้างโปรไฟล์ที่โดดเด่นและแสดงผลงานของคุณ
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  รับโอกาสทำงานกับโครงการอสังหาริมทรัพย์ชั้นนำ
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  สร้างลิงก์พิเศษสำหรับติดตามผลและรับค่าคอมมิชชั่น
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  เติบโตไปพร้อมกับชุมชน Creators มืออาชีพ
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-primary mb-4">สำหรับทีมโครงการ</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  ค้นหา Creators ที่เหมาะสมกับแบรนด์ของคุณ
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  จัดการข้อมูลโครงการคอนโดและบ้านจัดสรร
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  ติดต่อ Creators ผ่านช่องทางที่สะดวก
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  ติดตามประสิทธิภาพแคมเปญแบบเรียลไทม์
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-primary/5 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-primary mb-3">
            เริ่มต้นการเดินทางของคุณวันนี้
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            เข้าร่วมชุมชน Creators มืออาชีพและเปิดโอกาสใหม่ๆ 
            ในการทำงานร่วมกับโครงการอสังหาริมทรัพย์ชั้นนำ
          </p>
        </div>
      </div>
    </section>
  );
}