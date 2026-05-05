'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Select from 'react-select';
import { toast } from 'sonner';
import { CheckCircle2, QrCode, UserRoundSearch } from 'lucide-react';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { checkInConfirmedEventParticipant, getEvents } from '../../utils/storage';
import type { Event } from '../../types';

const QrScanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false },
);

function extractCreatorIdFromQr(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const directMatch = text.match(uuidRegex);
  if (directMatch) return directMatch[0];

  try {
    const asUrl = new URL(text);
    const byParam =
      asUrl.searchParams.get('creatorId') ||
      asUrl.searchParams.get('creator_id') ||
      asUrl.searchParams.get('uid') ||
      asUrl.searchParams.get('id');
    if (byParam && uuidRegex.test(byParam)) {
      return byParam.match(uuidRegex)?.[0] ?? null;
    }
    const pathMatch = asUrl.pathname.match(uuidRegex);
    if (pathMatch) return pathMatch[0];
  } catch {
    // not url format
  }

  return null;
}

export function EventCheckInPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [manualQrText, setManualQrText] = useState('');
  const [lastScanMessage, setLastScanMessage] = useState('ยังไม่มีรายการสแกน');
  const [checking, setChecking] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const lastHandledRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingEvents(true);
        const rows = await getEvents();
        setEvents(rows);
        if (rows.length > 0) {
          setSelectedEventId(rows[0].id);
        }
      } catch (error) {
        console.error('Failed to load events for check-in:', error);
        toast.error('ไม่สามารถโหลดรายการ Event ได้');
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  const eventOptions = useMemo(
    () => events.map((event) => ({ value: event.id, label: `${event.name} (${event.date})` })),
    [events],
  );

  const processScanText = async (rawText: string) => {
    if (!selectedEventId || selectedEventId === 'all') {
      toast.error('กรุณาเลือก Event ก่อนสแกน');
      return;
    }

    const now = Date.now();
    if (lastHandledRef.current?.value === rawText && now - lastHandledRef.current.at < 1500) {
      return;
    }
    lastHandledRef.current = { value: rawText, at: now };

    const creatorId = extractCreatorIdFromQr(rawText);
    if (!creatorId) {
      setLastScanMessage(`ไม่พบ Creator ID ใน QR: ${rawText}`);
      toast.error('QR นี้ไม่มี Creator ID ที่ถูกต้อง');
      return;
    }

    try {
      setChecking(true);
      const result = await checkInConfirmedEventParticipant({
        eventId: selectedEventId,
        creatorId,
      });
      if (result.ok) {
        setLastScanMessage(`Check-in สำเร็จ: ${creatorId}`);
        toast.success('Check-in สำเร็จ');
        return;
      }
      if (result.reason === 'ALREADY_CHECKED_IN') {
        setLastScanMessage(`เช็กอินแล้วก่อนหน้า: ${creatorId}`);
        toast.info('Creator คนนี้เช็กอินแล้ว');
        return;
      }
      setLastScanMessage(`ไม่พบผู้ยืนยันในรายการ: ${creatorId}`);
      toast.error('ไม่พบผู้เข้าร่วมที่ยืนยันแล้วสำหรับ Event นี้');
    } catch (error) {
      console.error('check-in failed:', error);
      toast.error('เกิดข้อผิดพลาดระหว่างเช็กอิน');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header fixed={false} />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="mb-1 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-primary" />
            Event Check-in
          </h2>
          <p className="text-sm text-muted-foreground">เลือก Event แล้วสแกน QR จากอีเมลผู้เข้าร่วมที่ยืนยันแล้ว</p>
        </div>

        <div className="mb-5 max-w-xl">
          <label className="mb-1 block text-sm text-muted-foreground">เลือก Event</label>
          <Select
            options={eventOptions}
            value={eventOptions.find((option) => option.value === selectedEventId) ?? null}
            onChange={(option) => setSelectedEventId(option?.value ?? 'all')}
            isLoading={loadingEvents}
            isClearable={false}
            classNamePrefix="react-select"
            placeholder="เลือก Event"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-medium">สแกนด้วยกล้อง</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <QrScanner
                constraints={{ facingMode: 'environment' }}
                onScan={(detectedCodes) => {
                  const value = detectedCodes?.[0]?.rawValue ?? '';
                  if (value) {
                    void processScanText(value);
                  }
                }}
                onError={(error) => {
                  console.error('scanner error', error);
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-medium">กรอกข้อความ QR (สำรอง)</h3>
            <Input
              label="QR payload"
              value={manualQrText}
              onChange={setManualQrText}
              placeholder="วางข้อความจาก QR หรือ Creator ID"
            />
            <div className="mt-3">
              <Button
                onClick={() => void processScanText(manualQrText)}
                disabled={manualQrText.trim() === '' || checking}
                className="gap-2"
                center
              >
                <UserRoundSearch className="h-4 w-4" />
                ตรวจสอบและเช็กอิน
              </Button>
            </div>

            <div className="mt-5 rounded-md bg-muted/30 p-3 text-sm">
              <p className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ผลล่าสุด
              </p>
              <p className="text-muted-foreground">{lastScanMessage}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
