'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Image, FileText, Video, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { AffiliateMaterial, Project } from '../../types';
import {
  saveAffiliateMaterial,
  getAffiliateMaterials,
  updateAffiliateMaterial,
  deleteAffiliateMaterial,
  getProjects,
  generateUUID,
} from '../../utils/storage';
import { BASE_PATH } from '@/lib/publicPath';

const PAGE_SIZE = 20;

type FileTypeOption = { value: 'image' | 'pdf' | 'video'; label: string };

const FILE_TYPE_OPTIONS: FileTypeOption[] = [
  { value: 'image', label: 'รูปภาพ' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'วิดีโอ' },
];

const FILE_TYPE_ICON = {
  image: <Image size={16} />,
  pdf: <FileText size={16} />,
  video: <Video size={16} />,
};

export function AffiliateMaterialsAdmin() {
  const [materials, setMaterials] = useState<AffiliateMaterial[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState<string | undefined>(undefined);
  const [editSaving, setEditSaving] = useState(false);

  // Add form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'video'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadMaterials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadProjects = async () => {
    try {
      const projs = await getProjects();
      setProjects(projs);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลโครงการได้');
    }
  };

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const { data, count } = await getAffiliateMaterials({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setMaterials(data);
      setTotalCount(count);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId(undefined);
    setFileType('image');
    setFile(null);
    setPreviewUrl(null);
    setIsFormOpen(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && selected.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('กรุณาเลือกไฟล์');
      return;
    }
    if (!title.trim()) {
      toast.error('กรุณากรอกชื่อสื่อ');
      return;
    }

    setSaving(true);
    try {
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
        throw new Error(err.error ?? 'อัปโหลดไม่สำเร็จ');
      }

      const { url } = await uploadRes.json();

      await saveAffiliateMaterial({
        id: materialId,
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        fileUrl: url,
        fileType,
        createdAt: new Date().toISOString(),
      });

      toast.success('เพิ่มสื่อสำเร็จ');
      resetForm();
      setPage(0);
      await loadMaterials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบสื่อนี้ใช่หรือไม่?')) return;
    try {
      await deleteAffiliateMaterial(id);
      toast.success('ลบสื่อเรียบร้อย');
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch {
      toast.error('ไม่สามารถลบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const startEdit = (m: AffiliateMaterial) => {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDescription(m.description ?? '');
    setEditProjectId(m.projectId);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error('กรุณากรอกชื่อสื่อ');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/admin/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          projectId: editProjectId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'บันทึกไม่สำเร็จ');
      }
      const updated: AffiliateMaterial = await res.json();
      setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
      toast.success('แก้ไขสื่อสำเร็จ');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด');
    } finally {
      setEditSaving(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">จัดการสื่อการตลาด</h1>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
            <Plus size={16} />
            เพิ่มสื่อใหม่
          </Button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">เพิ่มสื่อการตลาด</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="ชื่อสื่อ"
                value={title}
                onChange={setTitle}
                placeholder="ชื่อสื่อการตลาด"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">คำอธิบาย / Caption</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="คำอธิบายหรือ Caption สำหรับ Creator"
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">โครงการ</label>
              <Select
                options={[{ value: '', label: 'ทุกโครงการ' }, ...projectOptions]}
                onChange={(opt) => setProjectId(opt?.value || undefined)}
                placeholder="เลือกโครงการ (ถ้ามี)"
                isClearable
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ประเภทไฟล์</label>
              <Select
                options={FILE_TYPE_OPTIONS}
                defaultValue={FILE_TYPE_OPTIONS[0]}
                onChange={(opt) => setFileType(opt?.value ?? 'image')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ไฟล์ *</label>
              <input
                type="file"
                accept={
                  fileType === 'image'
                    ? 'image/*'
                    : fileType === 'pdf'
                    ? 'application/pdf'
                    : 'video/*'
                }
                onChange={handleFileChange}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              {previewUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-32 w-auto rounded-md object-cover border border-border"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">ยังไม่มีสื่อการตลาด</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Preview</th>
                  <th className="text-left px-4 py-3 font-medium">ชื่อสื่อ</th>
                  <th className="text-left px-4 py-3 font-medium">โครงการ</th>
                  <th className="text-left px-4 py-3 font-medium">ประเภท</th>
                  <th className="text-left px-4 py-3 font-medium">วันที่เพิ่ม</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map((m) => (
                  editingId === m.id ? (
                    <tr key={m.id} className="bg-muted/20">
                      <td className="px-4 py-3">
                        {m.fileType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.fileUrl}
                            alt={m.title}
                            className="h-12 w-16 object-cover rounded-md border border-border"
                          />
                        ) : (
                          <span className="text-muted-foreground">{FILE_TYPE_ICON[m.fileType]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3" colSpan={3}>
                        <div className="space-y-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="ชื่อสื่อ"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="คำอธิบาย / Caption"
                          />
                          <Select
                            options={[{ value: '', label: 'ทุกโครงการ' }, ...projectOptions]}
                            value={
                              editProjectId
                                ? { value: editProjectId, label: projectMap[editProjectId] ?? editProjectId }
                                : { value: '', label: 'ทุกโครงการ' }
                            }
                            onChange={(opt) => setEditProjectId(opt?.value || undefined)}
                            isClearable
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSave(m.id)}
                            disabled={editSaving}
                            className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                          >
                            {editSaving ? <Loader2 size={14} className="animate-spin" /> : 'บันทึก'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={editSaving}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        {m.fileType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.fileUrl}
                            alt={m.title}
                            className="h-12 w-16 object-cover rounded-md border border-border"
                          />
                        ) : (
                          <span className="text-muted-foreground">{FILE_TYPE_ICON[m.fileType]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{m.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.projectId ? (projectMap[m.projectId] ?? '-') : 'ทุกโครงการ'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          {FILE_TYPE_ICON[m.fileType]}
                          {m.fileType === 'image' ? 'รูปภาพ' : m.fileType === 'pdf' ? 'PDF' : 'วิดีโอ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(m)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="แก้ไข"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>หน้า {page + 1} / {totalPages} ({totalCount} รายการ)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalCount}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
