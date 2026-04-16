'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Building2, Home } from 'lucide-react';
import { FaGoogleDrive } from 'react-icons/fa';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { Project } from '../../types';
import { saveProject, generateUUID, uploadProjectImage } from '../../utils/storage';

export type ProjectFormProps = {
  mode: 'create' | 'edit';
  initialProject: Project | null;
  onCancel: () => void;
  onSaved: (project: Project) => void;
  heading?: string;
};

export function ProjectForm({ mode, initialProject, onCancel, onSaved, heading }: ProjectFormProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'condo' | 'house'>('condo');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [googleDrivePassword, setGoogleDrivePassword] = useState('creatorclub');
  const [projectStatus, setProjectStatus] = useState<string | undefined>(undefined);
  const [startComm, setStartComm] = useState('');
  const [maxComm, setMaxComm] = useState('');

  useEffect(() => {
    const p = initialProject;
    if (!p) {
      setName('');
      setType('condo');
      setLocation('');
      setDescription('');
      setBaseUrl('');
      setImageUrl('');
      setThumbUrl('');
      setGoogleDriveUrl('');
      setGoogleDrivePassword('creatorclub');
      setProjectStatus(undefined);
      setStartComm('');
      setMaxComm('');
      setImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    setName(p.name);
    setType(p.type);
    setLocation(p.location);
    setDescription(p.description || '');
    setBaseUrl(p.baseUrl);
    setImageUrl(p.imageUrl || '');
    setThumbUrl(p.thumbUrl || '');
    setGoogleDriveUrl(p.googleDriveUrl || '');
    setGoogleDrivePassword(p.googleDrivePassword || 'creatorclub');
    setProjectStatus(p.projectStatus || '');
    setStartComm(p.startComm || '');
    setMaxComm(p.maxComm || '');
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [initialProject]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกรูปภาพเท่านั้น');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setImageFile(file);
    setImageUrl('');

    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleRemoveImage = () => {
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    setImageUrl('');
  };

  const handleSubmit = async () => {
    if (!name || !location || !baseUrl) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      const projectId = initialProject?.id || generateUUID();

      let resolvedImageUrl: string | undefined = imageUrl || undefined;

      if (imageFile) {
        try {
          resolvedImageUrl = await uploadProjectImage(imageFile, projectId);
        } catch (error) {
          console.error('Error uploading project image:', error);
          toast.error('ไม่สามารถอัปโหลดรูปภาพได้');
          setSaving(false);
          return;
        }
      }

      const project: Project = {
        id: projectId,
        name,
        type,
        location,
        description,
        imageUrl: resolvedImageUrl,
        thumbUrl: thumbUrl || undefined,
        googleDriveUrl: googleDriveUrl || undefined,
        googleDrivePassword: googleDrivePassword || 'creatorclub',
        projectStatus,
        startComm: startComm || undefined,
        maxComm: maxComm || undefined,
        baseUrl,
        createdAt: initialProject?.createdAt || new Date().toISOString(),
      };

      await saveProject(project);
      toast.success(mode === 'edit' ? 'แก้ไขโครงการสำเร็จ' : 'เพิ่มโครงการสำเร็จ');
      onSaved(project);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const title =
    heading ?? (mode === 'edit' ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-6">
      <h3 className="text-primary mb-4">{title}</h3>

      <div className="flex flex-col gap-6">
        <Input
          label="ชื่อโครงการ"
          value={name}
          onChange={setName}
          placeholder="เช่น The Residence Sukhumvit"
          required
        />

        <div className="flex gap-10 flex-wrap">
          <div className="w-auto">
            <label className="block text-sm mb-2 text-foreground">
              ประเภท <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="condo"
                  checked={type === 'condo'}
                  onChange={(e) => setType(e.target.value as 'condo' | 'house')}
                  className="w-4 h-4 text-primary"
                />
                <Building2 className="w-4 h-4" />
                <span>คอนโด</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="house"
                  checked={type === 'house'}
                  onChange={(e) => setType(e.target.value as 'condo' | 'house')}
                  className="w-4 h-4 text-primary"
                />
                <Home className="w-4 h-4" />
                <span>บ้าน</span>
              </label>
            </div>
          </div>

          <div className="w-auto">
            <label className="block text-sm mb-2 text-foreground">สถานะโครงการ</label>
            <div className="flex gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="projectStatus"
                  value=""
                  checked={projectStatus === undefined}
                  onChange={() => setProjectStatus(undefined)}
                  className="w-4 h-4 text-primary"
                />
                <span>ไม่ระบุ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="projectStatus"
                  value="ready"
                  checked={projectStatus === 'ready'}
                  onChange={() => setProjectStatus('ready')}
                  className="w-4 h-4 text-primary"
                />
                <span>พร้อมอยู่</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="projectStatus"
                  value="new"
                  checked={projectStatus === 'new'}
                  onChange={() => setProjectStatus('new')}
                  className="w-4 h-4 text-primary"
                />
                <span>โครงการใหม่</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="projectStatus"
                  value="sold_out"
                  checked={projectStatus === 'sold_out'}
                  onChange={() => setProjectStatus('sold_out')}
                  className="w-4 h-4 text-primary"
                />
                <span>ขายหมด</span>
              </label>
            </div>
          </div>
        </div>

        <Input
          label="ทำเลที่ตั้ง"
          value={location}
          onChange={setLocation}
          placeholder="เช่น สุขุมวิท, กรุงเทพฯ"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ค่าแนะนำเริ่มต้น"
            value={startComm}
            onChange={setStartComm}
            placeholder="เช่น 50,000 บาท"
          />
          <Input
            label="ค่าแนะนำสูงสุด"
            value={maxComm}
            onChange={setMaxComm}
            placeholder="เช่น 100,000 บาท"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-foreground">รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับโครงการ"
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
          />
        </div>

        <Input
          label="URL ปลายทาง"
          value={baseUrl}
          onChange={setBaseUrl}
          placeholder="https://example.com/project"
          required
        />

        <Input
          label="Thumbnail URL (fallback)"
          value={thumbUrl}
          onChange={setThumbUrl}
          placeholder="https://example.com/thumb.jpg"
        />

        <div>
          <label className="block text-sm mb-2 text-foreground">รูปภาพโครงการ</label>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-32 h-32 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted text-xs text-muted-foreground">
              {imagePreviewUrl || imageUrl || thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreviewUrl || imageUrl || thumbUrl}
                  alt={name || 'Project image'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="px-2 text-center">no thumbnail</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={saving}
                className="block text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-background file:text-foreground hover:file:bg-muted"
              />
              <p className="text-xs text-muted-foreground">รองรับไฟล์ภาพสูงสุด 5MB (เช่น JPG, PNG)</p>
              {(imagePreviewUrl || imageUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-destructive hover:underline"
                  disabled={saving}
                >
                  ลบรูปภาพ
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} fullWidth disabled={saving}>
            {saving ? 'กำลังบันทึก...' : mode === 'edit' ? 'บันทึก' : 'เพิ่มโครงการ'}
          </Button>
          <Button onClick={onCancel} variant="outline" fullWidth disabled={saving}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </div>
  );
}
