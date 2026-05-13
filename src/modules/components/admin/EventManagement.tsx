'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Switch } from '../ui/switch';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import type { Event } from '../../types';
import {
  deleteEvent,
  generateUUID,
  getCreators,
  getEventParticipants,
  getEvents,
  saveEvent,
  updateEventParticipant,
} from '../../utils/storage';
import type { CreatorProfile, EventParticipant } from '../../types';
import { FaFileExcel } from 'react-icons/fa';
import { FaQrcode } from 'react-icons/fa6';

const PAGE_SIZE = 15;

type EventFormState = {
  id?: string;
  name: string;
  date: string;
  desc: string;
  dBanner: string;
  mBanner: string;
  location: string;
  locationMapUrl: string;
  /** When false, /event public page will not show this event. */
  isActive: boolean;
};

const DEFAULT_FORM: EventFormState = {
  name: '',
  date: '',
  desc: '',
  dBanner: '',
  mBanner: '',
  location: '',
  locationMapUrl: '',
  isActive: true,
};

export function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantEventFilter, setParticipantEventFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, participantsData, creatorsData] = await Promise.all([
        getEvents(),
        getEventParticipants(),
        getCreators(),
      ]);
      setEvents(eventsData);
      setParticipants(participantsData);
      setCreators(creatorsData);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('ไม่สามารถโหลดข้อมูลอีเวนต์ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const pool = [event.name, event.date, event.location || '', event.desc || '']
        .join(' ')
        .toLowerCase();
      return !q || pool.includes(q);
    });
  }, [events, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pagedEvents = filteredEvents.slice(start, start + PAGE_SIZE);
  const creatorById = useMemo(() => new Map(creators.map((creator) => [creator.id, creator])), [creators]);
  const eventNameById = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events]);

  const filteredParticipants = useMemo(() => {
    if (participantEventFilter === 'all') return participants;
    return participants.filter((participant) => participant.eventId === participantEventFilter);
  }, [participants, participantEventFilter]);
  const participantEventOptions = useMemo(
    () => [
      { value: 'all', label: 'ทั้งหมด' },
      ...events.map((event) => ({ value: event.id, label: event.name })),
    ],
    [events],
  );

  const handleExportParticipants = () => {
    if (filteredParticipants.length === 0) {
      toast.info('ไม่มีข้อมูลสำหรับ export');
      return;
    }

    const escapeCsv = (value: string): string => {
      if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = filteredParticipants.map((participant) => {
      const creator = creatorById.get(participant.creatorId);
      const statusLabel = participant.isConfirm ? 'ยืนยันแล้ว' : 'รอยืนยัน';

      return {
        eventName: eventNameById.get(participant.eventId) || participant.eventId,
        creatorName: creator ? `${creator.name} ${creator.lastName ?? ''}`.trim() : '',
        creatorEmail: creator?.email ?? '',
        creatorPhone: creator?.phone ?? '',
        creatorId: participant.creatorId,
        submitAt: participant.submitAt,
        status: statusLabel,
      };
    });

    const header = [
      'Event Name',
      'Creator Name',
      'Creator Email',
      'Creator Phone',
      'Creator ID',
      'Submit At',
      'Status',
    ];
    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.eventName,
          row.creatorName,
          row.creatorEmail,
          row.creatorPhone,
          row.creatorId,
          row.submitAt,
          row.status,
        ]
          .map((cell) => escapeCsv(cell))
          .join(','),
      ),
    ];

    const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const suffix = participantEventFilter === 'all' ? 'all-events' : participantEventFilter;
    anchor.href = url;
    anchor.download = `event-participants-${suffix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleConfirmParticipation = async (participantId: string, isConfirmed: boolean) => {
    try {
      await updateEventParticipant(participantId, { isConfirm: isConfirmed });
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === participantId ? { ...participant, isConfirm: isConfirmed } : participant,
        ),
      );
      toast.success(isConfirmed ? 'ยืนยันผู้สนใจเรียบร้อยแล้ว' : 'ยกเลิกการยืนยันเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error updating participation confirmation:', error);
      toast.error('ไม่สามารถอัปเดตสถานะการยืนยันได้');
    }
  };

  const submitLabel = editingId ? 'บันทึกการแก้ไข' : 'เพิ่มอีเวนต์';

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.date.trim()) {
      toast.error('กรุณากรอกชื่ออีเวนต์และวันที่');
      return;
    }

    try {
      setSaving(true);
      const payload: Event = {
        id: editingId ?? generateUUID(),
        createdAt: editingId
          ? events.find((event) => event.id === editingId)?.createdAt ?? new Date().toISOString()
          : new Date().toISOString(),
        name: form.name.trim(),
        date: form.date,
        desc: form.desc.trim() || undefined,
        dBanner: form.dBanner.trim() || undefined,
        mBanner: form.mBanner.trim() || undefined,
        location: form.location.trim() || undefined,
        locationMapUrl: form.locationMapUrl.trim() || undefined,
        isActive: form.isActive,
      };
      await saveEvent(payload);
      toast.success(editingId ? 'บันทึกการแก้ไขสำเร็จ' : 'เพิ่มอีเวนต์สำเร็จ');
      setForm(DEFAULT_FORM);
      setEditingId(null);
      setIsFormDrawerOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลอีเวนต์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setForm({
      id: event.id,
      name: event.name,
      date: event.date,
      desc: event.desc ?? '',
      dBanner: event.dBanner ?? '',
      mBanner: event.mBanner ?? '',
      location: event.location ?? '',
      locationMapUrl: event.locationMapUrl ?? '',
      isActive: event.isActive !== false,
    });
    setIsFormDrawerOpen(true);
  };

  const handleToggleEventActive = async (event: Event, isActive: boolean) => {
    const snapshot = events;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, isActive } : e)));
    try {
      await saveEvent({ ...event, isActive });
      toast.success(
        isActive
          ? 'เปิดแสดงบนหน้า /event แล้ว'
          : 'ปิดแสดงบนหน้า /event แล้ว — ผู้ใช้จะไม่เห็นอีเวนต์นี้เมื่อเข้า /event',
      );
    } catch (error) {
      console.error('Error toggling event active:', error);
      setEvents(snapshot);
      toast.error('ไม่สามารถอัปเดตสถานะอีเวนต์ได้');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบอีเวนต์นี้?')) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(DEFAULT_FORM);
      }
      toast.success('ลบอีเวนต์สำเร็จ');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('ไม่สามารถลบอีเวนต์ได้');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2>จัดการ Events ({filteredEvents.length})</h2>
        <div className="flex items-center gap-2">
          <Link href="/event/check-in">
            <Button variant="outline" className="gap-2" center>
              <FaQrcode className="h-4 w-4" />
              Check-in QR
            </Button>
          </Link>
          <Button
            className="gap-2"
            center
            onClick={() => {
              setEditingId(null);
              setForm(DEFAULT_FORM);
              setIsFormDrawerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            สร้าง Event
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="ค้นหา"
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="ชื่อ / สถานที่ / รายละเอียด"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลดข้อมูล...
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ชื่อ Event</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">สถานที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">หน้า /event</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  pagedEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{event.name}</div>
                          {event.desc ? <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{event.desc}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-sm">{event.date}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{event.location || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="inline-flex items-center gap-2">
                            <Switch
                              checked={event.isActive !== false}
                              onCheckedChange={(checked) => void handleToggleEventActive(event, checked)}
                              aria-label={event.isActive !== false ? 'ปิดหน้า /event' : 'เปิดหน้า /event'}
                            />
                            <span className="text-xs text-muted-foreground">
                              {event.isActive !== false ? 'เปิด' : 'ปิด'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" className="p-2" onClick={() => handleEdit(event)} aria-label="แก้ไข">
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="p-2"
                              onClick={() => void handleDelete(event.id)}
                              aria-label="ลบรายการ"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {filteredEvents.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 text-sm text-muted-foreground md:flex-row">
            <div>
              แสดง {start + 1}–{Math.min(start + PAGE_SIZE, filteredEvents.length)} จาก {filteredEvents.length} รายการ
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="px-3 py-1 text-sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safePage === 1}
              >
                ก่อนหน้า
              </Button>
              <span>
                หน้า {safePage} จาก {totalPages}
              </span>
              <Button
                variant="outline"
                className="px-3 py-1 text-sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={safePage >= totalPages}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h3 className="text-lg font-medium text-foreground">
              ผู้สนใจเข้าร่วม Event ({filteredParticipants.length})
            </h3>
            <div className="flex w-full flex-col gap-5 md:w-auto md:flex-row md:items-end">
              <div className="w-full md:w-72">
                <label className="mb-1 hidden text-sm text-muted-foreground">Filter Event</label>
                <Select
                  options={participantEventOptions}
                  value={participantEventOptions.find((option) => option.value === participantEventFilter)}
                  onChange={(option) => setParticipantEventFilter(option?.value ?? 'all')}
                  isClearable={false}
                  classNamePrefix="react-select"
                  placeholder="ทั้งหมด"
                />
              </div>
              <Button variant="outline" className="text-[15px] flex items-center gap-2" onClick={handleExportParticipants}>
                <FaFileExcel className="h-4 w-4" />
                Export {filteredParticipants.length}
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อ</th>
                <th className="px-4 py-3 text-left text-sm font-medium">อีเมล</th>
                <th className="px-4 py-3 text-left text-sm font-medium">โทรศัพท์</th>
                <th className="px-4 py-3 text-left text-sm font-medium">ลงทะเบียนเมื่อ</th>
                <th className="px-4 py-3 text-left text-sm font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูลผู้สนใจเข้าร่วม
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => {
                  const creator = creatorById.get(participant.creatorId);
                  const statusLabel = participant.isConfirm ? 'ยืนยันแล้ว' : 'รอยืนยัน';
                  const statusClass = participant.isConfirm ? 'text-emerald-700' : 'text-amber-600';
                  return (
                    <tr key={participant.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{eventNameById.get(participant.eventId) || participant.eventId}</td>
                      <td className="px-4 py-3 text-sm">{creator ? `${creator.name} ${creator.lastName ?? ''}`.trim() : '-'}</td>
                      <td className="px-4 py-3 text-sm">{creator?.email || '-'}</td>
                      <td className="px-4 py-3 text-sm">{creator?.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(participant.submitAt).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={participant.isConfirm}
                            onCheckedChange={(checked) =>
                              void handleConfirmParticipation(participant.id, checked)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {participant.isConfirm ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        direction="right"
        open={isFormDrawerOpen}
        onOpenChange={(open) => {
          setIsFormDrawerOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(DEFAULT_FORM);
          }
        }}
      >
        <DrawerContent className="overflow-y-auto">
          <DrawerHeader className="p-7">
            <DrawerTitle>{editingId ? 'แก้ไข' : 'เพิ่ม'}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-4 px-7 pb-7">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">แสดงบนหน้า /event</p>
                <p className="text-xs text-muted-foreground">
                  ปิดเมื่อต้องการซ่อนอีเวนต์จากผู้ใช้ — แอดมินยังจัดการและ check-in ได้ตามปกติ
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                aria-label="แสดงบนหน้า /event"
              />
            </div>
            <Input label="ชื่อ Event" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <Input label="วันที่จัดงาน" type="date" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} />
            <Input label="สถานที่" value={form.location} onChange={(value) => setForm((prev) => ({ ...prev, location: value }))} />
            <Input
              label="Google maps URL"
              value={form.locationMapUrl}
              onChange={(value) => setForm((prev) => ({ ...prev, locationMapUrl: value }))}
            />
            <Input label="Desktop Banner URL" value={form.dBanner} onChange={(value) => setForm((prev) => ({ ...prev, dBanner: value }))} />
            <Input label="Mobile Banner URL" value={form.mBanner} onChange={(value) => setForm((prev) => ({ ...prev, mBanner: value }))} />
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">รายละเอียด</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm"
                value={form.desc}
                onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="รายละเอียดกิจกรรม"
              />
            </div>
          </div>
          <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button center className="gap-2" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitLabel}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">ปิด</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
