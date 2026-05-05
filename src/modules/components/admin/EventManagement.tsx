'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { Event } from '../../types';
import {
  deleteEvent,
  generateUUID,
  getEvents,
  saveEvent,
} from '../../utils/storage';

const PAGE_SIZE = 15;

type EventFormState = {
  id?: string;
  name: string;
  date: string;
  desc: string;
  dBanner: string;
  mBanner: string;
  location: string;
};

const DEFAULT_FORM: EventFormState = {
  name: '',
  date: '',
  desc: '',
  dBanner: '',
  mBanner: '',
  location: '',
};

export function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<EventFormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
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
      };
      await saveEvent(payload);
      toast.success(editingId ? 'บันทึกการแก้ไขสำเร็จ' : 'เพิ่มอีเวนต์สำเร็จ');
      setForm(DEFAULT_FORM);
      setEditingId(null);
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
    });
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
        <Button variant="outline" className="gap-2" center onClick={() => void loadData()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          รีเฟรชข้อมูล
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-medium text-foreground">
          {editingId ? 'แก้ไข Event' : 'สร้าง Event ใหม่'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="ชื่อ Event" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
          <Input label="วันที่จัดงาน" type="date" value={form.date} onChange={(value) => setForm((prev) => ({ ...prev, date: value }))} />
          <Input label="สถานที่" value={form.location} onChange={(value) => setForm((prev) => ({ ...prev, location: value }))} />
          <Input label="Desktop Banner URL" value={form.dBanner} onChange={(value) => setForm((prev) => ({ ...prev, dBanner: value }))} />
          <Input label="Mobile Banner URL" value={form.mBanner} onChange={(value) => setForm((prev) => ({ ...prev, mBanner: value }))} />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-muted-foreground">รายละเอียด</label>
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-input-background px-3 py-2 text-sm"
              value={form.desc}
              onChange={(e) => setForm((prev) => ({ ...prev, desc: e.target.value }))}
              placeholder="รายละเอียดกิจกรรม"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button center className="gap-2" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {editingId ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(DEFAULT_FORM);
              }}
            >
              ยกเลิกการแก้ไข
            </Button>
          ) : null}
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
                  <th className="px-4 py-3 text-left text-sm font-medium">Banner</th>
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
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div className="max-w-[300px] space-y-1">
                            <div className="truncate">D: {event.dBanner || '-'}</div>
                            <div className="truncate">M: {event.mBanner || '-'}</div>
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
    </div>
  );
}
