import { useState, useEffect, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Building2, Home, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Project } from '../../types';
import { saveProject, getProjects, deleteProject, generateUUID, uploadProjectImage } from '../../utils/storage';

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'condo' | 'house'>('condo');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [googleDrivePassword, setGoogleDrivePassword] = useState('creatorclub');
  const [projectStatus, setProjectStatus] = useState<string | undefined>(undefined);
  const [startComm, setStartComm] = useState('');
  const [maxComm, setMaxComm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setType('condo');
    setLocation('');
    setDescription('');
    setBaseUrl('');
    setImageUrl('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setGoogleDriveUrl('');
    setGoogleDrivePassword('creatorclub');
    setProjectStatus(undefined);
    setStartComm('');
    setMaxComm('');
    setEditingProject(null);
    setIsFormOpen(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setType(project.type);
    setLocation(project.location);
    setDescription(project.description || '');
    setBaseUrl(project.baseUrl);
    setImageUrl(project.imageUrl || '');
    setGoogleDriveUrl(project.googleDriveUrl || '');
    setGoogleDrivePassword(project.googleDrivePassword || 'creatorclub');
    setProjectStatus(project.projectStatus || '');
    setStartComm(project.startComm || '');
    setMaxComm(project.maxComm || '');
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบโครงการนี้หรือไม่?')) {
      try {
        await deleteProject(id);
        await loadProjects();
        toast.success('ลบโครงการสำเร็จ');
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('ไม่สามารถลบโครงการได้');
      }
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('กรุณาเลือกรูปภาพเท่านั้น');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setImageFile(file);
    setImageUrl('');

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImageUrl('');
    setImagePreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!name || !location || !baseUrl) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      const projectId = editingProject?.id || generateUUID();

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
        googleDriveUrl: googleDriveUrl || undefined,
        googleDrivePassword: googleDrivePassword || 'creatorclub',
        projectStatus,
        startComm: startComm || undefined,
        maxComm: maxComm || undefined,
        baseUrl,
        createdAt: editingProject?.createdAt || new Date().toISOString()
      };

      await saveProject(project);
      await loadProjects();
      toast.success(editingProject ? 'แก้ไขโครงการสำเร็จ' : 'เพิ่มโครงการสำเร็จ');
      resetForm();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>จัดการโครงการ</h2>
          <p className="text-muted-foreground mt-1">
            จัดการคอนโด/บ้านสำหรับ Affiliate
          </p>
        </div>
        {!isFormOpen && (
        <Button
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center gap-2 cursor-pointer ${isFormOpen ? 'hidden' : ''}`}
        >
          <Plus className="w-4 h-4" />
          เพิ่มโครงการ
        </Button>
        )}
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
          <h3 className="text-primary mb-4">
            {editingProject ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
          </h3>
          
          <div className="flex flex-col gap-6">
            <Input
              label="ชื่อโครงการ"
              value={name}
              onChange={setName}
              placeholder="เช่น The Residence Sukhumvit"
              required
            />

            <div className="flex gap-10">
              <div className='w-auto'>
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

              <div className='w-auto'>
                <label className="block text-sm mb-2 text-foreground">
                  สถานะโครงการ
                </label>
                <div className="flex gap-2">
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
                    <span>Pre-sale</span>
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
              <label className="block text-sm mb-2 text-foreground">
                รายละเอียด
              </label>
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
              label="Google Drive materials link"
              value={googleDriveUrl}
              onChange={setGoogleDriveUrl}
              placeholder="https://drive.google.com/..."
            />

            <Input
              label="Google Drive password"
              value={googleDrivePassword}
              onChange={setGoogleDrivePassword}
              placeholder="creatorclub"
            />
            <p className="text-xs text-muted-foreground">
              ค่าเริ่มต้น: <code>creatorclub</code> (สามารถแก้ไขได้)
            </p>

            <div>
              <label className="block text-sm mb-2 text-foreground">
                รูปภาพโครงการ
              </label>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="w-32 h-32 rounded-lg border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted text-xs text-muted-foreground">
                  {imagePreviewUrl || imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreviewUrl || imageUrl}
                      alt={name || 'Project image'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="px-2 text-center">
                      ไม่มีรูปภาพ
                    </span>
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
                  <p className="text-xs text-muted-foreground">
                    รองรับไฟล์ภาพสูงสุด 5MB (เช่น JPG, PNG)
                  </p>
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
                {saving ? 'กำลังบันทึก...' : (editingProject ? 'บันทึก' : 'เพิ่มโครงการ')}
              </Button>
              <Button onClick={resetForm} variant="outline" fullWidth disabled={saving}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-primary">โครงการทั้งหมด ({projects.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              ยังไม่มีโครงการ เพิ่มโครงการแรกของคุณเลย!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground w-[400px]">
                    โครงการ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground w-[150px]">
                    ประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    ทำเล
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    URL
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-foreground">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-foreground">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {project.type === 'condo' ? (
                          <>
                            <Building2 className="w-4 h-4 text-primary" />
                            <span>คอนโด</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-4 h-4 text-primary" />
                            <span>บ้าน</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.location}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {project.baseUrl}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
