'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import fgf_icon from '@/assets/fgf-img.webp';
import aff_icon from '@/assets/aff-img.webp';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from '@/modules/context/SessionContext';
import { getCreatorById } from '@/modules/utils/storage';
import { formatGenericErrorToast } from '@/modules/utils/toast-error';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

export function CreatorTools() {
  const { currentUserId, userRole } = useSession();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    problem: '',
  });

  useEffect(() => {
    let isMounted = true;

    const prefillCreatorData = async () => {
      if (!isReportModalOpen || !currentUserId || userRole !== 'creator') return;
      try {
        const creator = await getCreatorById(currentUserId);
        if (!creator || !isMounted) return;

        setReportForm((prev) => ({
          ...prev,
          fullName: [creator.name, creator.lastName].filter(Boolean).join(' ').trim() || prev.fullName,
          email: creator.email || prev.email,
          phone: creator.phone || prev.phone,
        }));
      } catch (error) {
        console.warn('Failed to prefill report problem form:', error);
      }
    };

    void prefillCreatorData();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, isReportModalOpen, userRole]);

  const handleReportProblems = () => {
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reportForm.fullName || !reportForm.email || !reportForm.phone || !reportForm.problem) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/report-problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error || 'ส่งข้อมูลไม่สำเร็จ');
      }

      toast.success('ส่งข้อมูลแจ้งปัญหาเรียบร้อยแล้ว');
      setReportForm((prev) => ({ ...prev, problem: '' }));
      setIsReportModalOpen(false);
    } catch (error) {
      toast.error(formatGenericErrorToast('ไม่สามารถส่งข้อมูลแจ้งปัญหาได้', error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="creator_tools" className="relative bg-primary text-white pt-10 pb-10">
      <div className="container mx-auto px-6">
        <h3 className="text-3xl lg:text-5xl font-medium text-center mb-2">เป็นครีเอเตอร์กับเราวันนี้</h3>
        <p className="text-center text-neutral-50 font-light text-base lg:text-xl">รับโอกาสในการเข้าถึงเครื่องมือสร้างรายได้<br className="block lg:hidden" />จากคอนเทนต์</p>
        <div className="h-10"></div>
        <div className="flex flex-col md:flex-row justify-center gap-7 max-w-6xl mx-auto">
          <div className="aff bg-gradient-to-br min-h-[250px] from-white to-orange-100 w-full md:w-1/2 rounded-lg p-7 shadow-lg relative overflow-hidden pb-[200px] lg:pb-0">
            <h4 className="text-3xl font-medium mb-2 text-primary">AFFILIATE PROGRAM</h4>
            <p className="text-black w-full lg:w-2/3">เลือกโปรโมท 36 โครงการจาก ASSETWISE ผ่าน<br className='hidden lg:block' />โซเชียลมีเดียเพื่อรับค่าคอมมิชชันง่าย ๆ
            เพียงแชร์ลิงก์หรือโพสต์คอนเทนต์ เมื่อมีการจองรับผลตอบแทนสูงสุดถึง 500,000 บาท*</p>
            <Image src={aff_icon} alt="AFFILIATE PROGRAM" width={500} height={500} className="absolute -bottom-[30%] left-0 lg:-bottom-[35%] lg:-right-[15%] lg:left-auto w-full lg:w-[320px] h-auto" />
            <div className="h-5"></div>
            <Link href="/affiliate" className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-md">ดูเพิ่มเติม</Link>
          </div>
          <div className="fgf bg-gradient-to-br min-h-[250px] from-white to-orange-100 w-full md:w-1/2 rounded-lg p-7 shadow-lg relative overflow-hidden pb-[200px] lg:pb-0">
            <h4 className="text-3xl font-medium mb-2 text-primary">FRIEND GET FRIENDS</h4>
            <p className="text-black w-2/3">ชวนเพื่อนมาเป็นเพื่อนบ้าน ในโครงการบ้านและคอนโดมิเนียมของ ASSETWISE รับค่าแนะนำสูงสุด 500,000 บาท*</p>
            <Image src={fgf_icon} alt="FRIEND GET FRIENDS" width={500} height={500} className="absolute -bottom-[30%] left-0 lg:-bottom-[35%] lg:-right-[15%] lg:left-auto w-full lg:w-[320px] h-auto" />
            <div className="h-5"></div>
            <Link href="/friendgetfriends" className="bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 rounded-md relative">ดูเพิ่มเติม</Link>
          </div>
        </div>
      </div>
      <div className="h-7"></div>
      <div id="report_problems" className="bg-primary">
        <div className="container mx-auto px-6">
          <p className="text-center text-neutral-50 font-light text-base lg:text-xl">พบปัญหาในการใช้งาน ? <button onClick={handleReportProblems} className="text-white underline cursor-pointer text-lg">แจ้งปัญหาที่นี่</button></p>
        </div>
      </div>

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>แจ้งปัญหาการใช้งาน</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลด้านล่างเพื่อแจ้งปัญหาในการใช้งาน
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div>
              <label htmlFor="report-full-name" className="block text-sm font-medium mb-1">ชื่อ-นามสกุล</label>
              <input
                id="report-full-name"
                type="text"
                value={reportForm.fullName}
                onChange={(event) =>
                  setReportForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="report-email" className="block text-sm font-medium mb-1">อีเมล</label>
              <input
                id="report-email"
                type="email"
                value={reportForm.email}
                onChange={(event) =>
                  setReportForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="report-phone" className="block text-sm font-medium mb-1">เบอร์โทร</label>
              <input
                id="report-phone"
                type="tel"
                value={reportForm.phone}
                onChange={(event) =>
                  setReportForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="report-problem" className="block text-sm font-medium mb-1">ปัญหาที่พบ</label>
              <textarea
                id="report-problem"
                value={reportForm.problem}
                onChange={(event) =>
                  setReportForm((prev) => ({ ...prev, problem: event.target.value }))
                }
                className="w-full min-h-32 rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'กำลังส่ง...' : 'ส่งข้อมูล'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}