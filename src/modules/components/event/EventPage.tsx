'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, MapPin, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';
import { Button } from '../shared/Button';
import { useSession } from '../../context/SessionContext';
import {
  getCreatorEventParticipation,
  getCurrentEvent,
  joinCurrentEvent,
} from '../../utils/storage';
import type { Event } from '../../types';
import { formatGenericErrorToast } from '../../utils/toast-error';

export function EventPage() {
  const { currentUserId, userRole, handleLogin } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const currentEvent = await getCurrentEvent();
        setEvent(currentEvent);
      } catch (error) {
        console.error('loadEvent error:', error);
        toast.error('ไม่สามารถโหลดข้อมูลอีเวนต์ได้');
      } finally {
        setLoading(false);
      }
    };
    void loadEvent();
  }, []);

  useEffect(() => {
    const checkJoined = async () => {
      if (!event || !currentUserId || userRole !== 'creator') {
        setJoined(false);
        return;
      }
      try {
        const row = await getCreatorEventParticipation(event.id, currentUserId);
        setJoined(Boolean(row));
      } catch (error) {
        console.error('checkJoined error:', error);
      }
    };
    void checkJoined();
  }, [event, currentUserId, userRole]);

  const handleJoin = async () => {
    if (!event) return;
    if (!currentUserId || userRole !== 'creator') {
      toast.error('กรุณาเข้าสู่ระบบด้วยบัญชี Creator ก่อนเข้าร่วมอีเวนต์');
      return;
    }

    try {
      setJoining(true);
      const result = await joinCurrentEvent(event.id, currentUserId);
      setJoined(true);
      if (result.created) {
        toast.success('ลงทะเบียนเข้าร่วมอีเวนต์เรียบร้อยแล้ว');
      } else {
        toast.info('คุณลงทะเบียนอีเวนต์นี้แล้ว');
      }
    } catch (error) {
      console.error('join event error:', error);
      toast.error(formatGenericErrorToast('ไม่สามารถลงทะเบียนอีเวนต์ได้', error));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogin={handleLogin} />

      {loading ? (
        <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูลอีเวนต์...
          </span>
        </div>
      ) : !event ? (
        <div className="container mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-8 shadow-sm">
            <h2 className="mb-2">ยังไม่มีอีเวนต์ให้ลงทะเบียน</h2>
            <p className="text-muted-foreground">โปรดติดตามประกาศจากทีมงาน Creator Club</p>
          </div>
        </div>
      ) : (
        <>
          {event.dBanner ? (
            <section className="w-full">
              <picture>
                {event.mBanner ? <source media="(max-width: 768px)" srcSet={event.mBanner} /> : null}
                <img src={event.dBanner} alt={event.name} className="h-auto w-full object-cover" />
              </picture>
            </section>
          ) : null}

          <section className="container mx-auto px-6 py-10">
            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                <PartyPopper className="h-4 w-4" />
                EVENT REGISTRATION
              </div>

              <h1 className="mb-4 text-3xl font-medium text-foreground">{event.name}</h1>

              <div className="mb-6 grid grid-cols-1 gap-3 text-sm text-foreground md:grid-cols-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span>วันที่จัดงาน: {event.date}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>สถานที่: {event.location || 'จะแจ้งให้ทราบอีกครั้ง'}</span>
                </div>
              </div>

              {event.desc ? (
                <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {event.desc}
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                {joined ? (
                  <p className="text-sm text-emerald-700">คุณลงทะเบียนเข้าร่วมอีเวนต์นี้แล้ว</p>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">
                    สำหรับ Creator ที่สนใจเข้าร่วม กรุณาเข้าสู่ระบบก่อนแล้วกดปุ่มลงทะเบียน
                  </p>
                )}
                <Button
                  onClick={() => void handleJoin()}
                  disabled={joining || joined}
                  center
                  className="gap-2"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {joined ? 'ลงทะเบียนแล้ว' : 'สนใจเข้าร่วมอีเวนต์'}
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
