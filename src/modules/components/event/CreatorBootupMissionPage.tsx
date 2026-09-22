'use client';

/**
 * Temporary Creators Bootcamp mission page.
 * Disable with BOOTCAMP_MISSION_ENABLED = false when the event ends,
 * or delete src/app/creator-bootup-mission/.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  QrCode,
} from 'lucide-react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { toast } from 'sonner';
import creatorImg from '@/assets/creator-img.webp';
import affImg from '@/assets/aff-img.webp';
import fgfImg from '@/assets/fgf-img.webp';
import { Header } from '../landing/Header';
import { LoginModal } from '../landing/LoginModal';
import Footer from '../landing/Footer';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useSession } from '../../context/SessionContext';
import {
  getCreatorEventParticipation,
  getEventBySlug,
  updateEventParticipant,
} from '../../utils/storage';
import type { Event, EventParticipant } from '../../types';
import { formatGenericErrorToast } from '../../utils/toast-error';
import { stripHtmlTags } from '../../utils/strip-html-tags';

// ── Easy-to-edit constants ──────────────────────────────────────────
const BOOTCAMP_MISSION_ENABLED = true;
const BOOTCAMP_EVENT_SLUG = 'creator-bootcamp';
/** Mock short-link template; `{uid}` is replaced with the creator id. */
const BOOTCAMP_MOCK_SHORT_LINK = 'https://asw.to/bootcamp?uid={uid}';

type SurveyQuestion =
  | { id: string; label: string; type: 'choice'; options: string[] }
  | { id: string; label: string; type: 'text' };

/** Replace these labels/options before the live event. */
const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    label: 'คุณรู้จัก AssetWise Creator Club จากช่องทางใด?',
    type: 'choice',
    options: ['โซเชียลมีเดีย', 'เพื่อนแนะนำ', 'อีเมล/ไลน์', 'อื่นๆ'],
  },
  {
    id: 'q2',
    label: 'แพลตฟอร์มหลักที่คุณใช้สร้างคอนเทนต์คืออะไร?',
    type: 'choice',
    options: ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'อื่นๆ'],
  },
  {
    id: 'q3',
    label: 'เป้าหมายหลักในการเข้าร่วม Bootcamp ครั้งนี้คืออะไร?',
    type: 'choice',
    options: ['เรียนรู้คอนเทนต์', 'สร้างรายได้', 'สร้างเครือข่าย', 'อื่นๆ'],
  },
  {
    id: 'q4',
    label: 'ประสบการณ์ทำคอนเทนต์อสังหาฯ ของคุณอยู่ในระดับใด?',
    type: 'choice',
    options: ['มือใหม่', 'ปานกลาง', 'มีประสบการณ์'],
  },
  {
    id: 'q5',
    label: 'มีข้อเสนอแนะหรือสิ่งที่อยากได้จากทีมงานเพิ่มเติมไหม?',
    type: 'text',
  },
];

type GateState =
  | 'loading'
  | 'disabled'
  | 'need_login'
  | 'no_event'
  | 'need_register'
  | 'need_confirm'
  | 'ready';

function buildMockShortLink(creatorId: string): string {
  return BOOTCAMP_MOCK_SHORT_LINK.replace('{uid}', encodeURIComponent(creatorId));
}

function createAdminPreviewParticipant(eventId: string, adminId: string): EventParticipant {
  return {
    id: `preview-${adminId}`,
    eventId,
    creatorId: adminId,
    isShowup: false,
    isConfirm: true,
    submitAt: new Date().toISOString(),
    surveyAnswers: undefined,
    surveySubmittedAt: undefined,
    missionPostLinks: [],
  };
}

function ProgressGauge({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  const r = 70;
  const circumference = Math.PI * r;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <div className="relative mx-auto flex h-36 w-full max-w-[240px] items-end justify-center">
      <svg viewBox="0 0 180 100" className="h-full w-full" aria-hidden>
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="#e8e4df"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="#f26f06"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>
      <div className="absolute bottom-1 left-0 right-0 text-center">
        <div className="text-3xl font-bold tabular-nums text-foreground">
          {completed}
          <span className="text-lg font-medium text-muted-foreground"> / {total}</span>
        </div>
        <div className="text-xs text-muted-foreground">missions</div>
      </div>
    </div>
  );
}

export function CreatorBootupMissionPage() {
  const { currentUserId, userRole, sessionReady, handleLogin, handleLogout } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [gate, setGate] = useState<GateState>('loading');
  /** Admin bypass — local-only participant, no DB writes. */
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [surveyDraft, setSurveyDraft] = useState<Record<string, string>>({});
  const [postLinksDraft, setPostLinksDraft] = useState<string[]>(['']);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [savingPosts, setSavingPosts] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadMission = useCallback(async () => {
    if (!BOOTCAMP_MISSION_ENABLED) {
      setGate('disabled');
      setIsAdminPreview(false);
      return;
    }
    if (!sessionReady) return;

    try {
      setGate((prev) => (prev === 'ready' ? prev : 'loading'));

      const currentEvent = await getEventBySlug(BOOTCAMP_EVENT_SLUG, { includeInactive: true });
      setEvent(currentEvent);

      if (!currentEvent) {
        setParticipant(null);
        setIsAdminPreview(false);
        setGate('no_event');
        return;
      }

      // Admin can preview the full mission board without registering as a creator.
      if (currentUserId && userRole === 'admin') {
        setParticipant((prev) => {
          if (prev?.id.startsWith('preview-')) return prev;
          return createAdminPreviewParticipant(currentEvent.id, currentUserId);
        });
        setIsAdminPreview(true);
        setGate('ready');
        return;
      }

      if (!currentUserId || userRole !== 'creator') {
        setParticipant(null);
        setIsAdminPreview(false);
        setGate('need_login');
        return;
      }

      const row = await getCreatorEventParticipation(currentEvent.id, currentUserId);
      setParticipant(row);
      setIsAdminPreview(false);

      if (!row) {
        setGate('need_register');
        return;
      }
      if (!row.isConfirm) {
        setGate('need_confirm');
        return;
      }

      setGate('ready');
    } catch (error) {
      console.error('loadMission error:', error);
      toast.error(formatGenericErrorToast('ไม่สามารถโหลดภารกิจได้', error));
      setGate('no_event');
    }
  }, [currentUserId, sessionReady, userRole]);

  useEffect(() => {
    void loadMission();
  }, [loadMission]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadMission();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadMission]);

  useEffect(() => {
    if (gate === 'need_login') setShowLoginModal(true);
  }, [gate]);

  const step1Done = Boolean(participant?.isShowup);
  const step2Done = Boolean(participant?.surveySubmittedAt);
  const step3Done = (participant?.missionPostLinks?.filter((u) => u.trim()).length ?? 0) >= 1;
  const completedCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const mockShortLink = useMemo(
    () => (currentUserId ? buildMockShortLink(currentUserId) : ''),
    [currentUserId],
  );

  const openSurvey = () => {
    if (!step1Done) {
      toast.info('กรุณาไปเช็คอินที่แอดมินก่อนจึงจะไป Step 2 ได้');
      return;
    }
    setSurveyDraft(participant?.surveyAnswers ?? {});
    setSurveyOpen(true);
  };

  const openSubmit = () => {
    if (!step1Done) {
      toast.info('กรุณาไปเช็คอินที่แอดมินก่อนจึงจะไป Step 3 ได้');
      return;
    }
    const links = participant?.missionPostLinks?.filter((u) => u.trim()) ?? [];
    setPostLinksDraft(links.length > 0 ? links : ['']);
    setSubmitOpen(true);
  };

  const handleSaveSurvey = async () => {
    if (!participant) return;

    for (const q of SURVEY_QUESTIONS) {
      const value = (surveyDraft[q.id] ?? '').trim();
      if (!value) {
        toast.error('กรุณาตอบคำถามให้ครบทุกข้อ');
        return;
      }
    }

    try {
      setSavingSurvey(true);
      const answers: Record<string, string> = {};
      for (const q of SURVEY_QUESTIONS) {
        answers[q.id] = (surveyDraft[q.id] ?? '').trim();
      }
      const submittedAt = new Date().toISOString();
      if (!isAdminPreview) {
        await updateEventParticipant(participant.id, {
          surveyAnswers: answers,
          surveySubmittedAt: submittedAt,
        });
      }
      setParticipant({
        ...participant,
        surveyAnswers: answers,
        surveySubmittedAt: submittedAt,
      });
      setSurveyOpen(false);
      toast.success(
        isAdminPreview
          ? 'บันทึกแบบสอบถามแล้ว (Preview — ไม่ลงฐานข้อมูล)'
          : 'บันทึกแบบสอบถามเรียบร้อยแล้ว',
      );
    } catch (error) {
      console.error('save survey error:', error);
      toast.error(formatGenericErrorToast('ไม่สามารถบันทึกแบบสอบถามได้', error));
    } finally {
      setSavingSurvey(false);
    }
  };

  const handleSavePosts = async () => {
    if (!participant) return;
    const normalized = postLinksDraft.map((u) => u.trim()).filter((u) => u.length > 0);
    if (normalized.length < 1) {
      toast.error('กรุณาใส่ลิงก์โพสต์อย่างน้อย 1 ลิงก์');
      return;
    }

    try {
      setSavingPosts(true);
      if (!isAdminPreview) {
        await updateEventParticipant(participant.id, { missionPostLinks: normalized });
      }
      setParticipant({ ...participant, missionPostLinks: normalized });
      setSubmitOpen(false);
      toast.success(
        isAdminPreview
          ? 'บันทึกลิงก์โพสต์แล้ว (Preview — ไม่ลงฐานข้อมูล)'
          : 'บันทึกลิงก์โพสต์เรียบร้อยแล้ว',
      );
    } catch (error) {
      console.error('save posts error:', error);
      toast.error(formatGenericErrorToast('ไม่สามารถบันทึกลิงก์โพสต์ได้', error));
    } finally {
      setSavingPosts(false);
    }
  };

  const togglePreviewCheckIn = () => {
    if (!participant || !isAdminPreview) return;
    setParticipant({ ...participant, isShowup: !participant.isShowup });
    toast.info(participant.isShowup ? 'จำลอง: ยังไม่เช็คอิน' : 'จำลอง: เช็คอินแล้ว');
  };

  const resetPreviewProgress = () => {
    if (!event || !currentUserId || !isAdminPreview) return;
    setParticipant(createAdminPreviewParticipant(event.id, currentUserId));
    toast.info('รีเซ็ตสถานะ Preview แล้ว');
  };

  const handleCopyShortLink = () => {
    if (!mockShortLink) return;
    navigator.clipboard
      .writeText(mockShortLink)
      .then(() => {
        setCopied(true);
        toast.success('คัดลอกลิงก์แล้ว!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('ไม่สามารถคัดลอกได้'));
  };

  const eventTitle = event?.name ? stripHtmlTags(event.name) : 'Creators Bootcamp';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf8f5_0%,#fff1e6_55%,#ffe8d6_100%)]">
      <Header fixed={false} onLogin={handleLogin} onLogout={handleLogout} />

      {isAdminPreview && gate === 'ready' ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-2 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4 shrink-0" />
              โหมด Preview สำหรับแอดมิน — ไม่บันทึกลงฐานข้อมูล
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={togglePreviewCheckIn}
                className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100"
              >
                {step1Done ? 'ยกเลิกเช็คอิน (จำลอง)' : 'จำลองเช็คอิน'}
              </button>
              <button
                type="button"
                onClick={resetPreviewProgress}
                className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100"
              >
                รีเซ็ต
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="container mx-auto max-w-lg px-4 py-8 md:max-w-2xl md:px-6">
        {gate === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลดภารกิจ...
          </div>
        )}

        {gate === 'disabled' && (
          <StatusCard
            title="ภารกิจปิดแล้ว"
            description="Creators Bootcamp Mission ได้สิ้นสุดลงแล้ว ขอบคุณที่ร่วมสนุก"
          />
        )}

        {gate === 'no_event' && (
          <StatusCard
            title="ไม่พบอีเวนต์"
            description="ยังไม่มีอีเวนต์ Creators Bootcamp หรือลิงก์ไม่ถูกต้อง"
          />
        )}

        {gate === 'need_login' && (
          <StatusCard
            title="เข้าสู่ระบบเพื่อเริ่มภารกิจ"
            description="กรุณาเข้าสู่ระบบด้วยบัญชี Creator ที่ได้รับการอนุมัติแล้ว"
            action={
              <Button onClick={() => setShowLoginModal(true)} className="cursor-pointer">
                เข้าสู่ระบบ
              </Button>
            }
          />
        )}

        {gate === 'need_register' && (
          <StatusCard
            title="ยังไม่ได้ลงทะเบียนอีเวนต์"
            description="กรุณาลงทะเบียนเข้าร่วม Creators Bootcamp ก่อน แล้วรอทีมงานยืนยัน"
            action={
              <Link
                href={`/event/${BOOTCAMP_EVENT_SLUG}`}
                className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-primary-foreground hover:bg-primary/90"
              >
                ไปหน้าลงทะเบียนอีเวนต์
              </Link>
            }
          />
        )}

        {gate === 'need_confirm' && (
          <StatusCard
            title="รอการยืนยันจากทีมงาน"
            description="คุณลงทะเบียนแล้ว แต่ยังไม่ได้รับการคอนเฟิร์มเข้าร่วมอีเวนต์ กรุณารอการติดต่อจากทีมงาน"
          />
        )}

        {gate === 'ready' && participant && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm font-medium text-accent">Creators Bootcamp</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">{eventTitle}</h1>
              <p className="mt-1 text-sm text-muted-foreground">ทำภารกิจให้ครบ 3 สเต็ป</p>
            </div>

            {/* Progress card */}
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(242,111,6,0.25)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Mission Progress</h2>
                  <p className="text-sm text-muted-foreground">ติดตามสถานะภารกิจของคุณ</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-accent">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <ProgressGauge completed={completedCount} total={3} />
            </div>

            {/* Step cards grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MissionStepCard
                title="เช็คอิน"
                statusLabel={step1Done ? 'Success' : 'รอเช็คอิน'}
                success={step1Done}
                locked={false}
                image={creatorImg}
                imageAlt="เช็คอิน"
                onClick={() => {
                  if (step1Done) {
                    toast.success('คุณเช็คอินเรียบร้อยแล้ว');
                  } else {
                    toast.info('กรุณาไปเช็คอินที่แอดมินก่อนจึงจะไป Step 2 ได้');
                  }
                }}
                footer={
                  step1Done ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> สำเร็จ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <QrCode className="h-3.5 w-3.5" /> ที่หน้างาน
                    </span>
                  )
                }
              />

              <MissionStepCard
                title="แบบสอบถาม"
                statusLabel={step2Done ? 'Success' : step1Done ? 'พร้อมทำ' : 'ล็อก'}
                success={step2Done}
                locked={!step1Done}
                image={affImg}
                imageAlt="แบบสอบถาม"
                onClick={openSurvey}
                footer={
                  step2Done ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> สำเร็จ
                    </span>
                  ) : !step1Done ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" /> ต้องเช็คอินก่อน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <ClipboardList className="h-3.5 w-3.5" /> {SURVEY_QUESTIONS.length} ข้อ
                    </span>
                  )
                }
              />

              <MissionStepCard
                title="ส่งผลงาน"
                statusLabel={step3Done ? 'Success' : step1Done ? 'พร้อมส่ง' : 'ล็อก'}
                success={step3Done}
                locked={!step1Done}
                image={fgfImg}
                imageAlt="ส่งผลงาน"
                className="sm:col-span-2"
                onClick={openSubmit}
                footer={
                  step3Done ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> สำเร็จ
                    </span>
                  ) : !step1Done ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" /> ต้องเช็คอินก่อน
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <Link2 className="h-3.5 w-3.5" /> วางลิงก์โพสต์
                    </span>
                  )
                }
              />
            </div>

            {!step1Done && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  กรุณาไปเช็คอินที่แอดมินก่อนจึงจะไป Step 2 และ Step 3 ได้
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Survey dialog */}
      <Dialog open={surveyOpen} onOpenChange={setSurveyOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>แบบสอบถาม Bootcamp</DialogTitle>
            <DialogDescription>ตอบคำถามให้ครบทุกข้อ แล้วกดบันทึก</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {SURVEY_QUESTIONS.map((q, index) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  {index + 1}. {q.label}
                </label>
                {q.type === 'choice' ? (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt) => {
                      const selected = surveyDraft[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSurveyDraft((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                            selected
                              ? 'border-accent bg-orange-50 text-foreground'
                              : 'border-border bg-white hover:border-accent/40'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={surveyDraft[q.id] ?? ''}
                    onChange={(e) => setSurveyDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    placeholder="พิมพ์คำตอบของคุณ..."
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSurveyOpen(false)}
              className="cursor-pointer"
            >
              ปิด
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveSurvey()}
              disabled={savingSurvey}
              className="cursor-pointer gap-2"
            >
              {savingSurvey ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit work dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ส่งผลงาน</DialogTitle>
            <DialogDescription>
              คัดลอกลิงก์ย่อไปโพสต์ แล้ววางลิงก์โพสต์ของคุณกลับมาที่นี่
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">ลิงก์ย่อสำหรับโพสต์</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-mono text-sm select-all">
                  {mockShortLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopyShortLink}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> คัดลอกแล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> คัดลอก
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground">
                  ลิงก์โพสต์ของคุณ (Facebook / TikTok / IG)
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPostLinksDraft((prev) => [...prev, ''])}
                  className="cursor-pointer flex items-center gap-1"
                >
                  เพิ่ม
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {postLinksDraft.map((postLink, index) => (
                  <div key={`mission-post-${index}`} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label={`Post Link ${index + 1}`}
                        value={postLink}
                        onChange={(value) =>
                          setPostLinksDraft((prev) =>
                            prev.map((item, i) => (i === index ? value : item)),
                          )
                        }
                        placeholder="https://facebook.com/... หรือ https://tiktok.com/..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setPostLinksDraft((prev) => {
                          const next = prev.filter((_, i) => i !== index);
                          return next.length > 0 ? next : [''];
                        })
                      }
                      className="cursor-pointer rounded-full p-2"
                      disabled={postLinksDraft.length === 1 && !postLinksDraft[0].trim()}
                    >
                      <FaRegTrashAlt className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              className="cursor-pointer"
            >
              ปิด
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePosts()}
              disabled={savingPosts}
              className="cursor-pointer gap-2"
            >
              {savingPosts ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={(id, role) => {
            setShowLoginModal(false);
            handleLogin(id, role, '/creator-bootup-mission');
          }}
        />
      )}
    </div>
  );
}

function StatusCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-[28px] border border-white/80 bg-white p-8 text-center shadow-sm">
      <h2 className="mb-2 text-xl font-bold text-foreground">{title}</h2>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function MissionStepCard({
  title,
  statusLabel,
  success,
  locked,
  image,
  imageAlt,
  footer,
  onClick,
  className = '',
}: {
  title: string;
  statusLabel: string;
  success: boolean;
  locked: boolean;
  image: typeof creatorImg;
  imageAlt: string;
  footer: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[200px] cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white p-4 text-left shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 ${
        success
          ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50'
          : locked
            ? 'border-border/60 opacity-80'
            : 'border-white/80'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p
            className={`mt-0.5 text-xs font-medium ${
              success ? 'text-emerald-600' : locked ? 'text-muted-foreground' : 'text-accent'
            }`}
          >
            {statusLabel}
          </p>
        </div>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            success
              ? 'bg-emerald-100 text-emerald-600'
              : locked
                ? 'bg-muted text-muted-foreground'
                : 'bg-orange-50 text-accent group-hover:bg-orange-100'
          }`}
        >
          {success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : locked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
        </span>
      </div>

      <div className="relative mx-auto my-3 h-24 w-24 shrink-0">
        <Image src={image} alt={imageAlt} fill className="object-contain" sizes="96px" />
      </div>

      <div className="mt-auto text-xs">{footer}</div>
    </button>
  );
}
