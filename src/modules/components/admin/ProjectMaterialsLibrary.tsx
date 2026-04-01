'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Upload, Loader2, Pencil, Trash2, Search } from 'lucide-react';
import { BASE_PATH } from '@/lib/publicPath';
import type { AffiliateMaterial } from '../../types';
import { getAffiliateMaterialsByProject, generateUUID } from '../../utils/storage';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  FILE_TYPE_FILTER_OPTIONS,
  inferMaterialFileType,
  acceptForMaterialUpload,
  MaterialTypeIcon,
  materialFileTypeLabel,
  type MaterialFileType,
} from './affiliateMaterialShared';

type FilterValue = (typeof FILE_TYPE_FILTER_OPTIONS)[number]['value'];

export function ProjectMaterialsLibrary({ projectId }: { projectId: string }) {
  const [materials, setMaterials] = useState<AffiliateMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateMaterial | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAffiliateMaterialsByProject(projectId);
      setMaterials(data);
    } catch {
      toast.error('ไม่สามารถโหลดสื่อของโครงการได้');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      let okCount = 0;
      for (const file of files) {
        const fileType = inferMaterialFileType(file);
        if (!fileType) {
          toast.error(`ไฟล์ "${file.name}" ไม่รองรับ (ใช้รูป PDF หรือวิดีโอ)`);
          continue;
        }

        const materialId = generateUUID();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('materialId', materialId);

        const uploadRes = await fetch(`${BASE_PATH}/api/admin/materials/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'อัปโหลดไม่สำเร็จ');
        }
        const { url } = (await uploadRes.json()) as { url: string };

        const titleBase = file.name.replace(/\.[^/.]+$/, '') || 'สื่อใหม่';
        const saveRes = await fetch(`${BASE_PATH}/api/admin/materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: materialId,
            title: titleBase,
            projectId,
            fileUrl: url,
            fileType,
          }),
        });
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'บันทึกข้อมูลไม่สำเร็จ');
        }
        okCount += 1;
      }
      if (okCount > 0) {
        toast.success(`อัปโหลด ${okCount} ไฟล์สำเร็จ`);
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void uploadFiles(Array.from(list));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer.files;
    if (list?.length) void uploadFiles(Array.from(list));
  };

  const openEdit = (m: AffiliateMaterial) => {
    setEditing(m);
    setEditTitle(m.title);
    setEditDescription(m.description ?? '');
    setDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editing || !editTitle.trim()) {
      toast.error('กรุณากรอกชื่อสื่อ');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/materials/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          projectId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'บันทึกไม่สำเร็จ');
      }
      const updated = (await res.json()) as AffiliateMaterial;
      setMaterials((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setDialogOpen(false);
      setEditing(null);
      toast.success('แก้ไขสื่อสำเร็จ');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setEditSaving(false);
    }
  };

  const remove = async (m: AffiliateMaterial) => {
    if (!confirm(`ลบ "${m.title}" ใช่หรือไม่?`)) return;
    try {
      const delRes = await fetch(`${BASE_PATH}/api/admin/materials/${m.id}`, { method: 'DELETE' });
      if (!delRes.ok) {
        const err = await delRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'ลบไม่สำเร็จ');
      }
      setMaterials((prev) => prev.filter((x) => x.id !== m.id));
      toast.success('ลบสื่อเรียบร้อย');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ');
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = materials.filter((m) => {
    const typeOk = filter === 'all' || m.fileType === filter;
    const searchOk = !q || m.title.toLowerCase().includes(q);
    return typeOk && searchOk;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-6 mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">สื่อการตลาดของโครงการ</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptForMaterialUpload()}
            className="hidden"
            onChange={onInputChange}
            disabled={uploading}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {FILE_TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสื่อ..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed transition-colors min-h-[200px] ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
          }`}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
              <Upload className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">ยังไม่มีสื่อตามตัวกรองนี้</p>
              <p className="text-xs max-w-sm">
                ลากไฟล์วางที่นี่ หรือกด &quot;อัปโหลด&quot; — รองรับรูปภาพ PDF และวิดีโอ
              </p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="group relative rounded-lg border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {m.fileType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.fileUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MaterialTypeIcon fileType={m.fileType as MaterialFileType} className="text-muted-foreground" size={40} />
                    )}
                  </div>
                  <div className="p-2 border-t border-border">
                    <p className="text-xs font-medium truncate" title={m.title}>
                      {m.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{materialFileTypeLabel(m.fileType)}</p>
                  </div>
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="p-2 rounded-lg bg-background border border-border hover:bg-muted"
                      title="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      className="p-2 rounded-lg bg-background border border-border hover:bg-destructive/10 text-destructive"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขสื่อ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input label="ชื่อสื่อ" value={editTitle} onChange={setEditTitle} placeholder="ชื่อสื่อ" />
            <div>
              <label className="block text-sm font-medium mb-1">คำอธิบาย / Caption</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="คำอธิบายสำหรับ Creator"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={editSaving}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => void saveEdit()}
              disabled={editSaving}
              className="flex items-center gap-2"
            >
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
