'use client';

/**
 * Temporary Creators Bootcamp mission page.
 * Disable with BOOTCAMP_MISSION_ENABLED = false when the event ends,
 * or delete src/app/creator-bootcamp-mission/.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
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
  Star,
} from 'lucide-react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useSession } from '../../context/SessionContext';
import {
  getCreatorById,
  getCreatorEventParticipation,
  getEventBySlug,
  updateEventParticipant,
} from '../../utils/storage';
import type { CreatorProfile, Event, EventParticipant } from '../../types';
import { formatGenericErrorToast } from '../../utils/toast-error';
import { stripHtmlTags } from '../../utils/strip-html-tags';
import { BASE_PATH } from '@/lib/publicPath';
import { BOOTCAMP_SURVEY_QUESTIONS } from './bootcamp-survey';

// ── Easy-to-edit constants ──────────────────────────────────────────
const BOOTCAMP_MISSION_ENABLED = true;
const BOOTCAMP_EVENT_SLUG = 'creator-bootcamp';

/** Destination + metadata for TinyURL short links created on Step 3. */
const BOOTCAMP_SHORT_LINK = {
  /** Long URL destination (UTM/ref appended by /api/affiliate/shorten). */
  projectUrl: 'https://assetwise.co.th/condominium/modiz-voyage-srinakarin/',
  campaignName: 'Modiz Voyage Srinakarin - Creator Bootcamp',
  campaignKey: 'creator-bootcamp',
  utmSource: 'creator_club_affiliate',
  utmMedium: 'bootcamp',
  utmCampaign: 'creator-bootcamp',
} as const;

/** Mock short link for admin preview only; `{uid}` is replaced with the admin id. */
const BOOTCAMP_MOCK_SHORT_LINK = 'https://asw.to/bootcamp?uid={uid}';

type GateState =
  | 'loading'
  | 'disabled'
  | 'need_login'
  | 'no_event'
  | 'need_register'
  | 'need_confirm'
  | 'ready';

function createPreviewParticipant(eventId: string, previewUserId: string): EventParticipant {
  return {
    id: `preview-${previewUserId}`,
    eventId,
    creatorId: previewUserId,
    isShowup: false,
    isConfirm: true,
    submitAt: new Date().toISOString(),
    surveyAnswers: undefined,
    surveySubmittedAt: undefined,
    missionPostLinks: [],
  };
}

/** Minimum fields needed to ship a prize to the creator. */
function hasShippingAddress(profile: CreatorProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.addressHouseNo?.trim() &&
      profile.addressProvince?.trim() &&
      profile.addressDistrict?.trim() &&
      profile.addressSubDistrict?.trim() &&
      profile.addressPostalCode?.trim(),
  );
}

function ProgressGauge({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(1, completed / total) : 0;
  const r = 70;
  const circumference = Math.PI * r;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <div className="relative flex h-16 w-[120px] shrink-0 items-end justify-center sm:h-[72px] sm:w-[140px]">
      <svg viewBox="0 0 180 100" className="h-full w-full" aria-hidden>
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="#e8e4df"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
        <path
          d="M 20 95 A 70 70 0 0 1 160 95"
          fill="none"
          stroke="#f26f06"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center leading-none">
        <div className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
          {completed}
          <span className="text-sm font-medium text-muted-foreground"> / {total}</span>
        </div>
      </div>
    </div>
  );
}

export function CreatorBootupMissionPage() {
  const searchParams = useSearchParams();
  const isPreviewQuery = searchParams.get('preview') === '1';
  const { currentUserId, userRole, sessionReady, handleLogin, handleLogout } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [gate, setGate] = useState<GateState>('loading');
  /** Local-only preview — no DB writes (admin session or ?preview=1). */
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [surveyDraft, setSurveyDraft] = useState<Record<string, string>>({});
  const [postLinksDraft, setPostLinksDraft] = useState<string[]>(['']);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [savingPosts, setSavingPosts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [shortUrlLoading, setShortUrlLoading] = useState(false);
  const [shortUrlError, setShortUrlError] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);

  const loadMission = useCallback(async () => {
    if (!BOOTCAMP_MISSION_ENABLED) {
      setGate('disabled');
      setIsPreviewMode(false);
      return;
    }
    // ?preview=1 can load without waiting for session; otherwise wait for auth check.
    if (!sessionReady && !isPreviewQuery) return;

    try {
      setGate((prev) => (prev === 'ready' ? prev : 'loading'));

      const currentEvent = await getEventBySlug(BOOTCAMP_EVENT_SLUG, { includeInactive: true });
      setEvent(currentEvent);

      if (!currentEvent) {
        setParticipant(null);
        setCreatorProfile(null);
        setIsPreviewMode(false);
        setGate('no_event');
        return;
      }

      // Preview: admin session OR ?preview=1 — local-only board for testing steps.
      const allowPreview = isPreviewQuery || (Boolean(currentUserId) && userRole === 'admin');
      if (allowPreview) {
        const previewUserId = currentUserId || 'guest';
        setParticipant((prev) => {
          if (prev?.id.startsWith('preview-')) return prev;
          return createPreviewParticipant(currentEvent.id, previewUserId);
        });
        setCreatorProfile(null);
        setIsPreviewMode(true);
        setGate('ready');
        return;
      }

      if (!currentUserId || userRole !== 'creator') {
        setParticipant(null);
        setCreatorProfile(null);
        setIsPreviewMode(false);
        setGate('need_login');
        return;
      }

      const [row, profile] = await Promise.all([
        getCreatorEventParticipation(currentEvent.id, currentUserId),
        getCreatorById(currentUserId),
      ]);
      setParticipant(row);
      setCreatorProfile(profile);
      setIsPreviewMode(false);

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
  }, [currentUserId, isPreviewQuery, sessionReady, userRole]);

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
  const missionComplete = step1Done && step2Done && step3Done;
  const needsShippingAddress =
    !isPreviewMode && missionComplete && !hasShippingAddress(creatorProfile);

  const displayShortLink = isPreviewMode
    ? BOOTCAMP_MOCK_SHORT_LINK.replace(
        '{uid}',
        encodeURIComponent(currentUserId || 'guest'),
      )
    : shortUrl;

  const fetchBootcampShortLink = useCallback(async () => {
    if (isPreviewMode || userRole !== 'creator' || !currentUserId) {
      setShortUrl(null);
      setShortUrlError(false);
      setShortUrlLoading(false);
      return;
    }

    try {
      setShortUrlLoading(true);
      setShortUrlError(false);
      const res = await fetch(`${BASE_PATH}/api/affiliate/shorten`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectUrl: BOOTCAMP_SHORT_LINK.projectUrl,
          campaignName: BOOTCAMP_SHORT_LINK.campaignName,
          campaignKey: BOOTCAMP_SHORT_LINK.campaignKey,
          utmSource: BOOTCAMP_SHORT_LINK.utmSource,
          utmMedium: BOOTCAMP_SHORT_LINK.utmMedium,
          utmCampaign: BOOTCAMP_SHORT_LINK.utmCampaign,
          utmContent: currentUserId,
        }),
      });
      if (!res.ok) throw new Error('shorten failed');
      const data = (await res.json()) as { shortUrl?: string };
      if (typeof data.shortUrl !== 'string' || !data.shortUrl.trim()) {
        throw new Error('missing shortUrl');
      }
      setShortUrl(data.shortUrl.trim());
    } catch (error) {
      console.error('bootcamp short link error:', error);
      setShortUrl(null);
      setShortUrlError(true);
    } finally {
      setShortUrlLoading(false);
    }
  }, [currentUserId, isPreviewMode, userRole]);

  useEffect(() => {
    if (gate !== 'ready' || isPreviewMode) return;
    void fetchBootcampShortLink();
  }, [fetchBootcampShortLink, gate, isPreviewMode]);

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

    for (const q of BOOTCAMP_SURVEY_QUESTIONS) {
      const value = (surveyDraft[q.id] ?? '').trim();
      if (!value) {
        toast.error('กรุณาตอบคำถามให้ครบทุกข้อ');
        return;
      }
    }

    try {
      setSavingSurvey(true);
      const answers: Record<string, string> = {};
      for (const q of BOOTCAMP_SURVEY_QUESTIONS) {
        answers[q.id] = (surveyDraft[q.id] ?? '').trim();
      }
      const submittedAt = new Date().toISOString();
      if (!isPreviewMode) {
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
        isPreviewMode
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
      if (!isPreviewMode) {
        await updateEventParticipant(participant.id, { missionPostLinks: normalized });
      }
      setParticipant({ ...participant, missionPostLinks: normalized });
      setSubmitOpen(false);
      toast.success(
        isPreviewMode
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
    if (!participant || !isPreviewMode) return;
    setParticipant({ ...participant, isShowup: !participant.isShowup });
    toast.info(participant.isShowup ? 'จำลอง: ยังไม่เช็คอิน' : 'จำลอง: เช็คอินแล้ว');
  };

  const resetPreviewProgress = () => {
    if (!event || !isPreviewMode) return;
    const previewUserId = currentUserId || 'guest';
    setParticipant(createPreviewParticipant(event.id, previewUserId));
    toast.info('รีเซ็ตสถานะ Preview แล้ว');
  };

  const handleCopyShortLink = () => {
    if (!displayShortLink) return;
    navigator.clipboard
      .writeText(displayShortLink)
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

      {isPreviewMode && gate === 'ready' ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4 shrink-0" />
              โหมด Preview (?preview=1 หรือแอดมิน) — ไม่บันทึกลงฐานข้อมูล
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={togglePreviewCheckIn}
                className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1 text-[13px] font-medium hover:bg-amber-100"
              >
                {step1Done ? 'ยกเลิกเช็คอิน (จำลอง)' : 'จำลองเช็คอิน'}
              </button>
              <button
                type="button"
                onClick={resetPreviewProgress}
                className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1 text-[13px] font-medium hover:bg-amber-100"
              >
                รีเซ็ต
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main>
        <div className='banner'>
          <img src="https://assetwise.co.th/wp-content/uploads/2026/08/bootcamp-banner-m.webp" alt="Creators Bootcamp" className="md:hidden" />
          <img src="https://assetwise.co.th/wp-content/uploads/2026/08/bootcamp-banner-d.webp" alt="Creators Bootcamp" className="hidden md:block" />
        </div>
        <div className='container mx-auto max-w-lg px-4 py-8 md:max-w-2xl md:px-6'>
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
              <h1 className="mt-1 hidden text-2xl font-bold text-foreground md:text-3xl">{eventTitle}</h1>
              <p className="mt-1 text-sm text-muted-foreground">แค่ทำภารกิจให้ครบ<br/>รับรางวัลขาตั้งกล้อง <span className="text-accent font-bold ">XXXXX</span> มูลค่า <span className="text-accent font-bold">699</span> บาท</p>
            </div>

            {/* Progress card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-[0_8px_24px_-10px_rgba(242,111,6,0.22)] sm:px-5 sm:py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground">Mission Progress</h2>
                  <p className="text-xs text-muted-foreground">ติดตามสถานะภารกิจของคุณ</p>
                </div>
                <ProgressGauge completed={completedCount} total={3} />
              </div>
            </div>

            {needsShippingAddress ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 shadow-sm sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-950">
                        กรุณากรอกที่อยู่ปัจจุบันเพื่อรับรางวัล
                      </p>
                      <p className="mt-0.5 text-[13px] text-amber-900/80">
                        คุณทำครบ 3 ภารกิจแล้ว แต่ยังไม่มีที่อยู่สำหรับจัดส่งของรางวัลในโปรไฟล์
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/profile?edit=address"
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    ไปแก้ไขโปรไฟล์
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Step cards grid — 1+2 same row, 3 full width (mobile + desktop) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <MissionStepCard
                title="เช็คอิน"
                statusLabel={step1Done ? 'Success' : 'รอเช็คอิน'}
                success={step1Done}
                locked={false}
                watermark={QrCode}
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
                watermark={ClipboardList}
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
                      <ClipboardList className="h-3.5 w-3.5" /> {BOOTCAMP_SURVEY_QUESTIONS.length} ข้อ
                    </span>
                  )
                }
              />

              <MissionStepCard
                title="ส่งผลงาน"
                statusLabel={step3Done ? 'Success' : step1Done ? 'พร้อมส่ง' : 'ล็อก'}
                success={step3Done}
                locked={!step1Done}
                watermark={Link2}
                className="col-span-2"
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
        </div>
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
            {BOOTCAMP_SURVEY_QUESTIONS.map((q, index) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  {index + 1}. {q.label}
                </label>
                {q.type === 'choice' ? (
                  <Select
                    value={surveyDraft[q.id]?.trim() || undefined}
                    onValueChange={(value) =>
                      setSurveyDraft((prev) => ({ ...prev, [q.id]: value }))
                    }
                  >
                    <SelectTrigger className="h-auto min-h-10 w-full cursor-pointer rounded-xl border-border bg-white px-3 py-2.5 text-sm">
                      {surveyDraft[q.id]?.trim() ? (
                        <SelectValue />
                      ) : (
                        <span className="text-muted-foreground">เลือกคำตอบ</span>
                      )}
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {q.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="cursor-pointer">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : q.type === 'rating' ? (
                  <div className="flex flex-wrap items-center gap-1" role="group" aria-label={q.label}>
                    {Array.from({ length: q.max }, (_, i) => {
                      const value = String(i + 1);
                      const selected = Number(surveyDraft[q.id] || 0) >= i + 1;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSurveyDraft((prev) => ({ ...prev, [q.id]: value }))}
                          className="cursor-pointer rounded-lg p-0.5 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          aria-label={`${value} ดาว`}
                          aria-pressed={surveyDraft[q.id] === value}
                        >
                          <Star
                            className={`h-[32px] w-[32px] shrink-0 ${
                              selected
                                ? 'fill-accent text-accent'
                                : 'fill-transparent text-muted-foreground/40'
                            }`}
                          />
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
        <DialogContent className="flex max-h-[min(90dvh,720px)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-4 pr-12 text-left">
            <DialogTitle className="text-lg">ส่งผลงาน</DialogTitle>
            <DialogDescription className="text-xs">
              คัดลอกลิงก์ย่อไปโพสต์ แล้ววางลิงก์โพสต์ของคุณกลับมาที่นี่
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">ลิงก์ย่อสำหรับโพสต์</h4>
              {isPreviewMode ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-amber-700">
                    Preview — ลิงก์จำลอง (ไม่สร้าง TinyURL จริง)
                  </p>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs break-all select-all">
                      {displayShortLink}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyShortLink}
                      className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
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
              ) : shortUrlLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังสร้างลิงก์...
                </div>
              ) : shortUrlError || !shortUrl ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">สร้างลิงก์ไม่สำเร็จ กรุณาลองใหม่</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchBootcampShortLink()}
                    className="cursor-pointer"
                  >
                    ลองอีกครั้ง
                  </Button>
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-mono text-xs break-all select-all">
                    {shortUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShortLink}
                    className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
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
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  ลิงก์โพสต์ของคุณ
                  <span className="block text-[13px] font-normal text-muted-foreground">
                    Facebook / TikTok / IG และอื่น ๆ
                  </span>
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPostLinksDraft((prev) => [...prev, ''])}
                  className="cursor-pointer flex shrink-0 items-center gap-1 text-[13px]"
                >
                  เพิ่ม
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {postLinksDraft.map((postLink, index) => (
                  <div key={`mission-post-${index}`} className="flex min-w-0 items-end gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <Input
                        label={`Post Link ${index + 1}`}
                        value={postLink}
                        onChange={(value) =>
                          setPostLinksDraft((prev) =>
                            prev.map((item, i) => (i === index ? value : item)),
                          )
                        }
                        placeholder="https://facebook.com/... หรือ https://tiktok.com/..."
                        className="max-w-full text-[13px]"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPostLinksDraft((prev) => {
                          const next = prev.filter((_, i) => i !== index);
                          return next.length > 0 ? next : [''];
                        })
                      }
                      className="mb-0.5 cursor-pointer shrink-0 rounded-full p-2"
                      disabled={postLinksDraft.length === 1 && !postLinksDraft[0].trim()}
                    >
                      <FaRegTrashAlt className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              className="cursor-pointer text-[13px]"
            >
              ปิด
            </Button>
            <Button
              type="button"
              onClick={() => void handleSavePosts()}
              disabled={savingPosts}
              className="cursor-pointer gap-2 text-[13px]"
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
            handleLogin(id, role, '/creator-bootcamp-mission');
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
  watermark: WatermarkIcon,
  footer,
  onClick,
  className = '',
}: {
  title: string;
  statusLabel: string;
  success: boolean;
  locked: boolean;
  watermark: typeof QrCode;
  footer: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  const Watermark = success ? CheckCircle2 : locked ? Lock : WatermarkIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[120px] cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white p-4 text-left shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 ${
        success
          ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50'
          : locked
            ? 'border-border/60 opacity-80'
            : 'border-white/80'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 -right-3 select-none ${
          success
            ? 'text-emerald-500/15'
            : locked
              ? 'text-foreground/[0.08]'
              : 'text-accent/15'
        }`}
      >
        <Watermark className="h-24 w-24 stroke-[1.25]" />
      </span>

      <div className="relative z-10 flex min-h-[88px] min-w-0 flex-1 flex-col">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p
          className={`mt-0.5 text-xs font-medium ${
            success ? 'text-emerald-600' : locked ? 'text-muted-foreground' : 'text-accent'
          }`}
        >
          {statusLabel}
        </p>
        <div className="mt-auto pt-3 text-xs">{footer}</div>
      </div>
    </button>
  );
}
