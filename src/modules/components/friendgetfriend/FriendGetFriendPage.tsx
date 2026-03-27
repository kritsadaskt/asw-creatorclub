'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Header } from '../landing/Header';
import { HeroBanner } from '../landing/HeroBanner';
import { IntroSection } from '../landing/IntroSection';
import Footer from '../landing/Footer';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { getSession } from '../../utils/auth';
import { useSession } from '../../context/SessionContext';
import { getCreatorById } from '../../utils/storage';
import fgfDesktopBanner from '@/assets/fgf_desktop_banner.png';
import fgfMobileBanner from '@/assets/fgf_mobile_banner.png';
import { FriendGetFriendProjectList } from './FriendGetFriendProjectList';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { X } from 'lucide-react';

interface FriendGetFriendPageProps {
  onLogin?: (id: string, role: 'creator' | 'admin') => void;
}

export function FriendGetFriendPage({ onLogin }: FriendGetFriendPageProps) {
  const { handleLogin: sessionLogin, currentUserId } = useSession();
  const isLoggedIn = !!currentUserId || !!getSession();
  const [isRecommendDrawerOpen, setIsRecommendDrawerOpen] = useState(false);
  const [prefillLoaded, setPrefillLoaded] = useState(false);

  const [referrerName, setReferrerName] = useState('');
  const [referrerLastName, setReferrerLastName] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [referrerPhone, setReferrerPhone] = useState('');

  const [leadName, setLeadName] = useState('');
  const [leadLastName, setLeadLastName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    const loadCreatorProfile = async () => {
      if (!currentUserId) {
        setPrefillLoaded(true);
        return;
      }

      try {
        const creator = await getCreatorById(currentUserId);
        if (!creator) return;
        setReferrerName(creator.name || '');
        setReferrerLastName(creator.lastName || '');
        setReferrerEmail(creator.email || '');
        setReferrerPhone(creator.phone || '');
      } catch (error) {
        console.error('Failed to prefill creator profile', error);
      } finally {
        setPrefillLoaded(true);
      }
    };

    void loadCreatorProfile();
  }, [currentUserId]);

  const addProjectIfMissing = (projectName: string) => {
    setSelectedProjects((prev) => {
      if (prev.includes(projectName)) return prev;
      return [...prev, projectName];
    });
  };

  const removeProject = (projectName: string) => {
    setSelectedProjects((prev) => prev.filter((item) => item !== projectName));
  };

  const clearReferredLeadForm = () => {
    setLeadName('');
    setLeadLastName('');
    setLeadEmail('');
    setLeadPhone('');
    setSelectedProjects([]);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    setIsRecommendDrawerOpen(open);
    if (!open) {
      clearReferredLeadForm();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedProjects.length === 0) {
      toast.error('กรุณาเลือกโครงการอย่างน้อย 1 โครงการ');
      return;
    }

    const payload = {
      referrer: {
        name: referrerName,
        lastName: referrerLastName,
        email: referrerEmail,
        tel: referrerPhone,
      },
      referredLead: {
        name: leadName,
        lastName: leadLastName,
        email: leadEmail,
        tel: leadPhone,
      },
      projects: selectedProjects,
      createdAt: new Date().toISOString(),
    };

    // TODO: connect to API endpoint when backend table is ready
    console.log('Friend Get Friend submission', payload);
    toast.success('ส่งข้อมูลแนะนำเพื่อนเรียบร้อยแล้ว');
    clearReferredLeadForm();
    setIsRecommendDrawerOpen(false);
  };

  const referrerHelperText = isLoggedIn
    ? 'ข้อมูลผู้แนะนำถูกดึงจากโปรไฟล์ของคุณ สามารถแก้ไขได้ก่อนส่ง'
    : 'ยังไม่ได้เข้าสู่ระบบ กรุณากรอกข้อมูลผู้แนะนำด้วยตนเอง';

  return (
    <div className="min-h-screen">
      <Header onLogin={onLogin ?? sessionLogin} isLoggedInFromParent={isLoggedIn} />
      <HeroBanner imageDesktop={fgfDesktopBanner} imageMobile={fgfMobileBanner} />

      <FriendGetFriendProjectList
        onLogin={onLogin ?? sessionLogin}
        onRecommend={(project) => {
          addProjectIfMissing(project.name);
          setIsRecommendDrawerOpen(true);
        }}
      />

      <section id="friendgetfriend-form" className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold mb-3 text-primary">Friend Get Friend</h1>
              <p className="text-muted-foreground mb-2">
                แคมเปญพิเศษสำหรับ Creator Club ชวนเพื่อนมาร่วมเป็นครีเอเตอร์กับเรา
                ยิ่งชวนมาก ยิ่งมีโอกาสได้รับสิทธิพิเศษและของรางวัลจาก ASW
              </p>
              <p className="text-muted-foreground">ทุกคนสามารถกรอกฟอร์มแนะนำเพื่อนได้ทันที โดยไม่จำเป็นต้องเข้าสู่ระบบ</p>
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

            <div className="mt-8 border-t border-border pt-8 text-muted-foreground">
              เลือกโครงการจากตารางด้านบน แล้วกดปุ่ม `แนะนำเพื่อน` เพื่อกรอกฟอร์ม
            </div>
          </div>
        </div>
      </section>

      <IntroSection />

      <Drawer direction="right" open={isRecommendDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent>
          <DrawerHeader className="p-7">
            <div className="flex items-start justify-between gap-4">
              <DrawerTitle>แนะนำเพื่อน</DrawerTitle>
              <DrawerClose className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
                <span className="sr-only">ปิด</span>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="px-7 pb-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">ผู้แนะนำ  <span className="text-neutral-400 text-xs">{referrerHelperText}</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="ชื่อ" value={referrerName} onChange={setReferrerName} placeholder="กรอกชื่อผู้แนะนำ" required />
                  <Input label="นามสกุล" value={referrerLastName} onChange={setReferrerLastName} placeholder="กรอกนามสกุลผู้แนะนำ" required />
                  <Input label="อีเมล" type="email" value={referrerEmail} onChange={setReferrerEmail} placeholder="example@email.com" required />
                  <Input label="เบอร์โทรศัพท์" type="tel" value={referrerPhone} onChange={setReferrerPhone} placeholder="กรอกเบอร์โทรศัพท์ที่ติดต่อได้" required />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-medium text-foreground">ผู้ถูกแนะนำ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="ชื่อ" value={leadName} onChange={setLeadName} placeholder="กรอกชื่อผู้ถูกแนะนำ" required />
                  <Input label="นามสกุล" value={leadLastName} onChange={setLeadLastName} placeholder="กรอกนามสกุลผู้ถูกแนะนำ" required />
                  <Input label="อีเมล" type="email" value={leadEmail} onChange={setLeadEmail} placeholder="example@email.com" required />
                  <Input label="เบอร์โทรศัพท์" type="tel" value={leadPhone} onChange={setLeadPhone} placeholder="กรอกเบอร์โทรศัพท์ของผู้ถูกแนะนำ" required />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="font-medium text-foreground">โครงการที่แนะนำ</h3>
                {selectedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    ยังไม่ได้เลือกโครงการ กรุณากดปุ่ม `แนะนำเพื่อน` จากโครงการที่ต้องการก่อน
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedProjects.map((projectName) => (
                      <div
                        key={projectName}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-foreground"
                      >
                        <span>{projectName}</span>
                        <button
                          type="button"
                          onClick={() => removeProject(projectName)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label={`ลบโครงการ ${projectName}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <label className="flex items-start gap-2 text-sm" htmlFor="fgf-tc-checkbox">
                  <input
                    id="fgf-tc-checkbox"
                    type="checkbox"
                    required
                    className="mt-1 accent-primary"
                  />
                  <span className="text-muted-foreground">
                    ฉันยอมรับ{' '}
                    <a
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary hover:text-primary/80"
                    >
                      ข้อกำหนดและเงื่อนไข
                    </a>
                  </span>
                </label>
              </div>

              <Button type="submit" fullWidth disabled={isLoggedIn && !prefillLoaded}>
                SUBMIT
              </Button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>

      <Footer />
    </div>
  );
}

