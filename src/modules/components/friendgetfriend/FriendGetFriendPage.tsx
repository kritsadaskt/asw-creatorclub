'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '../landing/Header';
import { HeroBanner } from '../landing/HeroBanner';
import { IntroSection } from '../landing/IntroSection';
import Footer from '../landing/Footer';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { getSession } from '../../utils/auth';
import { useSession } from '../../context/SessionContext';
import fgfDesktopBanner from '@/assets/fgf_desktop_banner.png';
import fgfMobileBanner from '@/assets/fgf_mobile_banner.png';

interface FriendGetFriendPageProps {
  onLogin?: (id: string, role: 'creator' | 'admin') => void;
}

export function FriendGetFriendPage({ onLogin }: FriendGetFriendPageProps) {
  const { handleLogin: sessionLogin, currentUserId } = useSession();
  const isLoggedIn = !!currentUserId || !!getSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interestedProject, setInterestedProject] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // TODO: Connect to actual submission handling (API / storage)
    // For now, keep behavior minimal so you can review the UI.
    console.log('Friend Get Friend submission', {
      name,
      email,
      phone,
      interestedProject
    });
  };

  return (
    <div className="min-h-screen">
      <Header onLogin={onLogin ?? sessionLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner imageDesktop={fgfDesktopBanner} imageMobile={fgfMobileBanner} />
      <IntroSection />

      <section id="friendgetfriend-form" className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold mb-3 text-primary">
                Friend Get Friend
              </h1>
              <p className="text-muted-foreground mb-2">
                แคมเปญพิเศษสำหรับ Creator Club ชวนเพื่อนมาร่วมเป็นครีเอเตอร์กับเรา
                ยิ่งชวนมาก ยิ่งมีโอกาสได้รับสิทธิพิเศษและของรางวัลจาก ASW
              </p>
              <p className="text-muted-foreground">
                กรณียังไม่ได้เข้าสู่ระบบ คุณจะสามารถดูรายละเอียดของแคมเปญได้เท่านั้น
                หากต้องการกรอกฟอร์มแนะนำเพื่อน กรุณาเข้าสู่ระบบ Creator Club ก่อน
              </p>
              <div className="mt-3">
                <Link
                  href="/"
                  title="กลับสู่หน้า Creator Club"
                  className="inline-flex text-primary hover:underline cursor-pointer"
                >
                  กลับสู่หน้า Creator Club
                </Link>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                ยังไม่ได้เข้าสู่ระบบ
                <span className="mx-1">-</span>
                กรุณาเข้าสู่ระบบที่หน้า Creator Club เพื่อเริ่มแนะนำเพื่อนเข้าร่วมแคมเปญ
              </div>
            )}

            {isLoggedIn && (
              <div className="mt-8 border-t border-border pt-8">
                <h2 className="text-2xl font-semibold text-primary mb-2">
                  ฟอร์มแนะนำเพื่อน
                </h2>
                <p className="text-muted-foreground mb-6">
                  กรุณากรอกข้อมูลของคุณและเพื่อนที่ต้องการแนะนำให้ครบถ้วน
                  เพื่อให้ทีมงานสามารถติดต่อกลับได้อย่างรวดเร็ว
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-foreground">
                      ข้อมูลผู้แนะนำ (คุณ)
                    </h3>
                    <Input
                      label="ชื่อ-นามสกุล"
                      value={name}
                      onChange={setName}
                      placeholder="กรอกชื่อ-นามสกุลของคุณ"
                      required
                    />
                    <Input
                      label="อีเมล"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="example@email.com"
                      required
                    />
                    <Input
                      label="เบอร์โทรศัพท์"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="กรอกเบอร์โทรศัพท์ที่ติดต่อได้"
                      required
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="font-medium text-foreground">
                      ข้อมูลเพื่อนที่ต้องการแนะนำ
                    </h3>
                    <Input
                      label="โครงการที่สนใจแนะนำเพื่อน"
                      value={interestedProject}
                      onChange={setInterestedProject}
                      placeholder="เช่น คอนโดโครงการใดที่ต้องการแนะนำ"
                      required
                    />
                  </div>

                  <Button type="submit" fullWidth>
                    ส่งข้อมูลการแนะนำเพื่อน
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

