'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, Loader2, Mail, Pencil, Phone, Plus, Trash2, UserCheck } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Switch } from '../ui/switch';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import type { Event, Project } from '../../types';
import {
  deleteEvent,
  generateUUID,
  getCreatorById,
  getCreators,
  getEventParticipants,
  getEvents,
  getProjects,
  saveEvent,
  updateEventParticipant,
} from '../../utils/storage';
import { eventPreviewPath } from '../../utils/event-slug';
import type { CreatorProfile, EventParticipant } from '../../types';
import {
  FaFacebook,
  FaFileExcel,
  FaInstagram,
  FaPhone,
  FaQrcode,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { CreatorBadge } from '../ui/creator-badge';
import { CreatorTypeNameByKey } from '../ui/utils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProfileImageUrl } from '../../utils/profileImage';
import { Lemon8Icon } from '@/modules/utils/svg';

type SocialPlatform = keyof CreatorProfile['socialAccounts'];

const SOCIAL_ICON_MAP: Record<SocialPlatform, ReactNode> = {
  facebook: <FaFacebook className="h-4 w-4 text-[#1877F2]" />,
  instagram: <FaInstagram className="h-4 w-4 text-pink-500" />,
  tiktok: <FaTiktok className="h-4 w-4 text-black" />,
  youtube: <FaYoutube className="h-4 w-4 text-red-600" />,
  twitter: <FaXTwitter className="h-4 w-4 text-black" />,
  lemon8: <Lemon8Icon className="h-4 w-4 text-yellow-500" />,
};

function socialList(
  socialAccounts: CreatorProfile['socialAccounts'],
  followerCounts: CreatorProfile['followerCounts'],
) {
  const items = (Object.entries(socialAccounts) as Array<[SocialPlatform, string | undefined]>).filter(
    ([, url]) => Boolean(url),
  );
  if (items.length === 0) {
    return <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([platform, url]) => {
        const followers = followerCounts?.[platform];
        const followerLabel =
          typeof followers === 'number' && Number.isFinite(followers) ? followers.toLocaleString() : 'ไม่ระบุ';
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:bg-muted/50"
            aria-label={platform}
            title={platform}
          >
            {SOCIAL_ICON_MAP[platform]}
            <span className="text-foreground">{followerLabel}</span>
          </a>
        );
      })}
    </div>
  );
}

function isAswHouseholdType(typeRaw: string | undefined): boolean {
  const type = (typeRaw ?? '').trim().toLowerCase();
  return type === 'asw_household' || type === 'asw_houshold';
}

const PAGE_SIZE = 15;

/** Temporary Creators Bootcamp — panel/columns only when this event is filtered. */
const BOOTCAMP_EVENT_SLUG = 'creator-bootcamp';

type MissionProgressFilter = 'all' | 'prize_ready' | 'posts_done' | 'incomplete';

function hasMissionPosts(participant: EventParticipant): boolean {
  return (participant.missionPostLinks ?? []).some((url) => url.trim().length > 0);
}

function isMissionComplete(participant: EventParticipant): boolean {
  return (
    Boolean(participant.isShowup) &&
    Boolean(participant.surveySubmittedAt) &&
    hasMissionPosts(participant)
  );
}

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantEventFilter, setParticipantEventFilter] = useState('all');
  const [missionProgressFilter, setMissionProgressFilter] = useState<MissionProgressFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [participantPage, setParticipantPage] = useState(1);
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [isCreatorDrawerOpen, setIsCreatorDrawerOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [drawerParticipant, setDrawerParticipant] = useState<EventParticipant | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsData, participantsData, creatorsData, projectsData] = await Promise.all([
        getEvents(),
        getEventParticipants(),
        getCreators(),
        getProjects(),
      ]);
      setEvents(eventsData);
      setParticipants(participantsData);
      setCreators(creatorsData);
      setProjects(projectsData);
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
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  const bootcampEvent = useMemo(
    () => events.find((event) => event.slug === BOOTCAMP_EVENT_SLUG) ?? null,
    [events],
  );
  const isBootcampFilter =
    participantEventFilter !== 'all' &&
    eventById.get(participantEventFilter)?.slug === BOOTCAMP_EVENT_SLUG;

  const bootcampParticipants = useMemo(() => {
    if (!bootcampEvent) return [];
    return participants.filter((participant) => participant.eventId === bootcampEvent.id);
  }, [bootcampEvent, participants]);

  const bootcampStats = useMemo(() => {
    let confirmed = 0;
    let checkedIn = 0;
    let surveyDone = 0;
    let postsDone = 0;
    let prizeReady = 0;
    for (const participant of bootcampParticipants) {
      if (participant.isConfirm) confirmed += 1;
      if (participant.isShowup) checkedIn += 1;
      if (participant.surveySubmittedAt) surveyDone += 1;
      if (hasMissionPosts(participant)) postsDone += 1;
      if (isMissionComplete(participant)) prizeReady += 1;
    }
    return {
      total: bootcampParticipants.length,
      confirmed,
      checkedIn,
      surveyDone,
      postsDone,
      prizeReady,
    };
  }, [bootcampParticipants]);

  const filteredParticipants = useMemo(() => {
    let list =
      participantEventFilter === 'all'
        ? participants
        : participants.filter((participant) => participant.eventId === participantEventFilter);

    if (isBootcampFilter && missionProgressFilter !== 'all') {
      list = list.filter((participant) => {
        if (missionProgressFilter === 'prize_ready') return isMissionComplete(participant);
        if (missionProgressFilter === 'posts_done') return hasMissionPosts(participant);
        if (missionProgressFilter === 'incomplete') return !isMissionComplete(participant);
        return true;
      });
    }

    return list;
  }, [participants, participantEventFilter, isBootcampFilter, missionProgressFilter]);
  const participantTotalPages = Math.max(1, Math.ceil(filteredParticipants.length / PAGE_SIZE));
  const safeParticipantPage = Math.min(Math.max(participantPage, 1), participantTotalPages);
  const participantStart = (safeParticipantPage - 1) * PAGE_SIZE;
  const pagedParticipants = filteredParticipants.slice(participantStart, participantStart + PAGE_SIZE);
  const participantEventOptions = useMemo(
    () => [
      { value: 'all', label: 'ทั้งหมด' },
      ...events.map((event) => ({ value: event.id, label: event.name.replace(/<[^>]+>/g, '') })),
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
      const postLinks = (participant.missionPostLinks ?? []).filter((u) => u.trim());
      const missionComplete = isMissionComplete(participant);

      return {
        eventName: eventNameById.get(participant.eventId) || participant.eventId,
        creatorName: creator ? `${creator.name} ${creator.lastName ?? ''}`.trim() : '',
        creatorType: CreatorTypeNameByKey(creator?.type ?? '') ?? '',
        creatorEmail: creator?.email ?? '',
        creatorPhone: creator?.phone ?? '',
        creatorCategories:
          creator?.categories && creator.categories.length > 0 ? creator.categories.join(', ') : '',
        creatorId: participant.creatorId,
        submitAt: participant.submitAt,
        status: statusLabel,
        checkIn: participant.isShowup ? 'เช็คอินแล้ว' : 'ยังไม่เช็คอิน',
        survey: participant.surveySubmittedAt ? 'ส่งแล้ว' : 'ยังไม่ส่ง',
        postLinks: postLinks.length > 0 ? postLinks.join(' | ') : '',
        postLinkCount: String(postLinks.length),
        missionComplete: missionComplete ? 'Yes' : 'No',
        prizeEligible: missionComplete ? 'Yes' : 'No',
      };
    });

    const header = [
      'Event Name',
      'Creator Name',
      'Creator Type',
      'Creator Email',
      'Creator Phone',
      'Creator Category',
      'Creator ID',
      'Submit At',
      'Status',
      'Check-in',
      'Survey',
      'Post Link Count',
      'Post Links',
      'Mission Complete',
      'Prize Eligible',
    ];
    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.eventName,
          row.creatorName,
          row.creatorType,
          row.creatorEmail,
          row.creatorPhone,
          row.creatorCategories,
          row.creatorId,
          row.submitAt,
          row.status,
          row.checkIn,
          row.survey,
          row.postLinkCount,
          row.postLinks,
          row.missionComplete,
          row.prizeEligible,
        ]
          .map((cell) => escapeCsv(cell))
          .join(','),
      ),
    ];

    const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const suffix =
      participantEventFilter === 'all'
        ? 'all-events'
        : isBootcampFilter && missionProgressFilter !== 'all'
          ? `${participantEventFilter}-${missionProgressFilter}`
          : participantEventFilter;
    anchor.href = url;
    anchor.download = `event-participants-${suffix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleConfirmParticipant = async (participant: EventParticipant) => {
    if (participant.isConfirm) return;
    try {
      setConfirmingId(participant.id);
      await updateEventParticipant(participant.id, { isConfirm: true });
      setParticipants((prev) =>
        prev.map((row) => (row.id === participant.id ? { ...row, isConfirm: true } : row)),
      );
      toast.success('ยืนยันผู้เข้าร่วมเรียบร้อยแล้ว');
    } catch (error) {
      console.error('confirm participant error:', error);
      toast.error('ไม่สามารถยืนยันผู้เข้าร่วมได้');
    } finally {
      setConfirmingId(null);
    }
  };

  const openCreatorDrawer = async (creatorId: string, participant?: EventParticipant) => {
    setDrawerParticipant(participant ?? null);
    const cached = creatorById.get(creatorId);
    if (cached) {
      setSelectedCreator(cached);
      setIsCreatorDrawerOpen(true);
    }
    try {
      setCreatorLoading(true);
      if (!cached) {
        setIsCreatorDrawerOpen(true);
      }
      const creator = await getCreatorById(creatorId);
      if (!creator) {
        toast.error('ไม่พบข้อมูลครีเอเตอร์');
        setSelectedCreator(null);
        setDrawerParticipant(null);
        setIsCreatorDrawerOpen(false);
        return;
      }
      setSelectedCreator(creator);
    } catch (error) {
      console.error('Error loading creator detail:', error);
      toast.error('ไม่สามารถโหลดข้อมูลครีเอเตอร์ได้');
      setSelectedCreator(null);
      setDrawerParticipant(null);
      setIsCreatorDrawerOpen(false);
    } finally {
      setCreatorLoading(false);
    }
  };

  const drawerShowsMission =
    Boolean(drawerParticipant) &&
    eventById.get(drawerParticipant!.eventId)?.slug === BOOTCAMP_EVENT_SLUG;
  const drawerMissionLinks = (drawerParticipant?.missionPostLinks ?? []).filter((u) => u.trim());

  const submitLabel = editingId ? 'บันทึกการแก้ไข' : 'เพิ่มอีเวนต์';
  const editingSlug = editingId ? events.find((event) => event.id === editingId)?.slug : undefined;

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
        slug: editingId ? events.find((event) => event.id === editingId)?.slug : undefined,
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
        <div className="flex flex-col md:flex-row items-center gap-2">
          <Link href="/event/check-in" className="w-full md:w-auto">
            <Button variant="outline" className="gap-2 w-full md:w-auto" center>
              <FaQrcode className="h-4 w-4" />
              Check-in QR
            </Button>
          </Link>
          <Button
            className="gap-2 w-full md:w-auto"
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
                  <th className="px-4 py-3 text-center text-sm font-medium">จัดการ</th>
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
                        <td className="px-4 py-3 font-medium">
                          <div className="font-medium">{event.name.replace(/<[^>]+>/g, '')}</div>
                          {event.slug ? (
                            <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                              /event/{event.slug}
                            </div>
                          ) : null}
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
                            {event.slug ? (
                              <Link
                                href={eventPreviewPath(event.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg p-2 text-foreground hover:bg-muted hover:text-neutral-800"
                                aria-label="Preview หน้าอีเวนต์"
                                title={
                                  event.isActive !== false
                                    ? 'เปิดหน้า /event'
                                    : 'Preview หน้าอีเวนต์ (เฉพาะแอดมิน)'
                                }
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Link>
                            ) : (
                              <span title="บันทึกอีเวนต์อีกครั้งเพื่อสร้างลิงก์ preview">
                                <Button
                                  variant="ghost"
                                  className="p-2"
                                  disabled
                                  aria-label="ยังไม่มี slug สำหรับ preview"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </span>
                            )}
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
                  onChange={(option) => {
                    setParticipantEventFilter(option?.value ?? 'all');
                    setMissionProgressFilter('all');
                    setParticipantPage(1);
                  }}
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

          {isBootcampFilter ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Creators Bootcamp Mission</p>
                <p className="mt-0.5 text-[13px] text-amber-900/80">
                  สรุปความคืบหน้า 3 ขั้น — คลิกชื่อครีเอเตอร์เพื่อดูสถานะเช็คอิน / แบบสอบถาม / ลิงก์ผลงาน
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'ผู้เข้าร่วม', value: bootcampStats.total },
                  { label: 'คอนเฟิร์ม', value: bootcampStats.confirmed },
                  { label: 'เช็คอิน', value: bootcampStats.checkedIn },
                  { label: 'แบบสอบถาม', value: bootcampStats.surveyDone },
                  { label: 'ส่งลิงก์', value: bootcampStats.postsDone },
                  { label: 'พร้อมรับรางวัล', value: bootcampStats.prizeReady },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-center"
                  >
                    <div className="text-xl font-semibold tabular-nums text-foreground">{stat.value}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: 'all', label: 'ทั้งหมด' },
                    { value: 'prize_ready', label: `พร้อมรับรางวัล (${bootcampStats.prizeReady})` },
                    { value: 'posts_done', label: `ส่งลิงก์แล้ว (${bootcampStats.postsDone})` },
                    {
                      value: 'incomplete',
                      label: `ยังไม่ครบ (${Math.max(0, bootcampStats.total - bootcampStats.prizeReady)})`,
                    },
                  ] as const
                ).map((option) => {
                  const active = missionProgressFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMissionProgressFilter(option.value);
                        setParticipantPage(1);
                      }}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-white text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : bootcampEvent ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              เลือกอีเวนต์ Bootcamp ในตัวกรองเพื่อดูสรุป Mission — คลิกชื่อครีเอเตอร์เพื่อดูสถานะและลิงก์ผลงาน
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อ</th>
                <th className="px-4 py-3 text-left text-sm font-medium">หมวดหมู่</th>
                <th className="px-4 py-3 text-center text-sm font-medium">คอนเฟิร์ม</th>
                <th className="px-4 py-3 text-center text-sm font-medium">เช็คอิน</th>
                <th className="px-4 py-3 text-center text-sm font-medium">ยืนยัน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูลผู้สนใจเข้าร่วม
                  </td>
                </tr>
              ) : (
                pagedParticipants.map((participant) => {
                  const creator = creatorById.get(participant.creatorId);
                  const email = creator?.email?.trim();
                  const phone = creator?.phone?.trim();
                  const confirming = confirmingId === participant.id;
                  return (
                    <tr key={participant.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">
                        {eventNameById.get(participant.eventId)?.replace(/<[^>]+>/g, '') ||
                          participant.eventId}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {creator ? (
                          <div className="inline-flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openCreatorDrawer(participant.creatorId, participant)}
                              className="inline-flex flex-wrap items-center gap-1.5 text-left text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                            >
                              <span>{`${creator.name} ${creator.lastName ?? ''}`.trim()}</span>
                              <CreatorBadge type={creator.type ?? ''} />
                            </button>
                            {email ? (
                              <a
                                href={`mailto:${email}`}
                                aria-label={`ส่งอีเมลถึง ${email}`}
                                title={email}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/40"
                                aria-hidden
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {phone ? (
                              <a
                                href={`tel:${phone}`}
                                aria-label={`โทรหา ${phone}`}
                                title={phone}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground/40"
                                aria-hidden
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {creator?.categories && creator.categories.length > 0
                          ? creator.categories.join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {participant.isConfirm ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            รอยืนยัน
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {participant.isShowup ? (
                          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                            เช็คอินแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            ยังไม่เช็คอิน
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {participant.isConfirm ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            center
                            className="cursor-pointer flex items-center gap-2 text-sm"
                            disabled={confirming}
                            onClick={() => void handleConfirmParticipant(participant)}
                          >
                            {confirming ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>ยืนยัน</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredParticipants.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 text-sm text-muted-foreground md:flex-row">
            <div>
              แสดง {participantStart + 1}–{Math.min(participantStart + PAGE_SIZE, filteredParticipants.length)} จาก{' '}
              {filteredParticipants.length} รายการ
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="px-3 py-1 text-sm"
                onClick={() => setParticipantPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeParticipantPage === 1}
              >
                ก่อนหน้า
              </Button>
              <span>
                หน้า {safeParticipantPage} จาก {participantTotalPages}
              </span>
              <Button
                variant="outline"
                className="px-3 py-1 text-sm"
                onClick={() => setParticipantPage((prev) => Math.min(prev + 1, participantTotalPages))}
                disabled={safeParticipantPage >= participantTotalPages}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </div>

      <Drawer
        direction="right"
        open={isCreatorDrawerOpen}
        onOpenChange={(open) => {
          setIsCreatorDrawerOpen(open);
          if (!open) {
            setSelectedCreator(null);
            setDrawerParticipant(null);
          }
        }}
      >
        <DrawerContent className="overflow-y-auto">
          <DrawerHeader className="p-7">
            <DrawerTitle>รายละเอียดครีเอเตอร์</DrawerTitle>
            <DrawerDescription>
              {drawerShowsMission
                ? 'ข้อมูลครีเอเตอร์และสถานะ Bootcamp Mission'
                : 'ข้อมูลผู้สนใจเข้าร่วมอีเวนต์'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-7 pb-7">
            {creatorLoading && !selectedCreator ? (
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูล...
              </div>
            ) : selectedCreator ? (
              <>
                <div className="mb-2 flex justify-center">
                  {getProfileImageUrl(selectedCreator) ? (
                    <ImageWithFallback
                      src={getProfileImageUrl(selectedCreator)!}
                      alt={selectedCreator.name}
                      className="h-28 w-28 rounded-full border-4 border-primary/20 object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10">
                      <span className="text-4xl text-primary">{selectedCreator.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
                  <p className="flex flex-wrap items-center gap-1.5 text-foreground">
                    <span>
                      {selectedCreator.name} {selectedCreator.lastName ?? ''}
                    </span>
                    <CreatorBadge type={selectedCreator.type ?? ''} />
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">อีเมล</label>
                  <p className="text-foreground">
                    <a href={`mailto:${selectedCreator.email}`} className="text-primary hover:underline">
                      {selectedCreator.email || '-'}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
                  <p className="flex items-center gap-2 text-foreground">
                    <FaPhone className="h-4 w-4 text-primary" />
                    <a href={`tel:${selectedCreator.phone}`} className="text-primary hover:underline">
                      {selectedCreator.phone || '-'}
                    </a>
                  </p>
                </div>
                {isAswHouseholdType(selectedCreator.type) && (
                  <div>
                    <label className="text-muted-foreground">โครงการ</label>
                    <p className="text-foreground">
                      {selectedCreator.projectName
                        ? projects.find((p) => p.id === selectedCreator.projectName)?.name ||
                          selectedCreator.projectName
                        : 'ไม่ระบุ'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-muted-foreground">หมวดหมู่</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.categories && selectedCreator.categories.length > 0 ? (
                      selectedCreator.categories.map((category) => (
                        <div
                          key={category}
                          className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-primary"
                        >
                          {category}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1">บัญชีโซเชียลมีเดีย</label>
                  {socialList(selectedCreator.socialAccounts, selectedCreator.followerCounts)}
                </div>

                {drawerShowsMission && drawerParticipant ? (
                  <div className="mt-2 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <p className="text-sm font-medium text-amber-950">Bootcamp Mission</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-center">
                        <div className="text-[12px] text-muted-foreground">เช็คอิน</div>
                        <div className="mt-1">
                          {drawerParticipant.isShowup ? (
                            <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                              เช็คอินแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              ยังไม่เช็คอิน
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-center">
                        <div className="text-[12px] text-muted-foreground">แบบสอบถาม</div>
                        <div className="mt-1">
                          {drawerParticipant.surveySubmittedAt ? (
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                              ส่งแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              ยังไม่ส่ง
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-center">
                        <div className="text-[12px] text-muted-foreground">ผลงาน</div>
                        <div className="mt-1">
                          {drawerMissionLinks.length > 0 ? (
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                              {drawerMissionLinks.length} ลิงก์
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              ยังไม่ส่ง
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[13px] font-medium text-foreground">ลิงก์ผลงาน</p>
                      {drawerMissionLinks.length > 0 ? (
                        <ul className="space-y-2">
                          {drawerMissionLinks.map((link, index) => (
                            <li key={`${link}-${index}`}>
                              <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block break-all rounded-lg border border-border bg-white px-3 py-2 text-xs text-primary hover:bg-muted/40 hover:underline"
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์ผลงาน</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">ไม่พบข้อมูลครีเอเตอร์</p>
            )}
          </div>
          <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {selectedCreator?.phone ? (
              <Button
                variant="outline"
                center
                onClick={() => {
                  window.location.href = `tel:${selectedCreator.phone}`;
                }}
              >
                <FaPhone className="h-5 w-5" />
                ติดต่อ
              </Button>
            ) : null}
            <DrawerClose asChild>
              <Button variant="outline">ปิด</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
            <div>
              <Input label="ชื่อ Event" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
              <p className="mt-1 text-xs text-muted-foreground">
                {editingSlug
                  ? `ลิงก์หน้า: /event/${editingSlug}`
                  : 'ระบบจะสร้าง slug จากชื่ออีเวนต์อัตโนมัติ สำหรับลิงก์ preview ของแอดมิน'}
              </p>
            </div>
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
