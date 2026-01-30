import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">AssetWise Creators Club</h3>
            <p className="text-white/80">
              แพลตฟอร์มเชื่อมโยงผู้สร้างสรรค์คอนเทนต์กับโครงการอสังหาริมทรัพย์ชั้นนำ
              พร้อมเครื่องมือที่ช่วยให้คุณทำงานได้อย่างมืออาชีพ
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">เมนูด่วน</h4>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href="#register-section" className="hover:text-white transition-colors">
                  ลงทะเบียน
                </a>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const loginButton = document.querySelector('header button[class*="bg-primary"]') as HTMLButtonElement;
                    loginButton?.click();
                  }}
                  className="hover:text-white transition-colors"
                >
                  เข้าสู่ระบบ
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">ติดต่อเรา</h4>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start gap-2">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>hello@assetwisehub.com</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>02-123-4567</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span>กรุงเทพมหานคร ประเทศไทย</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-white/60">
          <p>&copy; {new Date().getFullYear()} AssetWise PLC สงวนลิขสิทธิ์.</p>
        </div>
      </div>
    </footer>
  );
}