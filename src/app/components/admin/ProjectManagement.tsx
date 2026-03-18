import { useState, useEffect, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Building2, Home, Pencil, Trash2, File } from 'lucide-react';
import Select from 'react-select';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Project } from '../../types';
import { saveProject, getProjects, deleteProject, generateUUID, uploadProjectImage } from '../../utils/storage';
import { FaGoogleDrive } from 'react-icons/fa';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'condo' | 'house'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'undefined' | 'ready' | 'new' | 'sold_out'>('all');
  const [currentPage, setCurrentPage] = useState(1);

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

  const PAGE_SIZE = 10;

  const typeOptions = [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'condo', label: 'คอนโด' },
    { value: 'house', label: 'บ้าน' }
  ];

  const statusOptions = [
    { value: 'all', label: 'ทุกสถานะ' },
    { value: 'undefined', label: 'ไม่ระบุ' },
    { value: 'ready', label: 'พร้อมอยู่' },
    { value: 'new', label: 'โครงการใหม่' },
    { value: 'sold_out', label: 'Pre-sale' }
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      !normalizedQuery ||
      [
        project.name,
        project.location,
        project.description || '',
        project.baseUrl
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesType =
      filterType === 'all' || project.type === filterType;

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'undefined'
          ? !project.projectStatus
          : project.projectStatus === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const pagedProjects = filteredProjects.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>
            โครงการทั้งหมด ({filteredProjects.length}
            {filteredProjects.length !== projects.length && ` / ${projects.length}`})
          </h2>
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
              icon={<FaGoogleDrive className="w-4 h-4" />}
            />

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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {projects.length > 0 && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto">
                <div className="w-full md:w-auto">
                  <Input
                    label="ค้นหา"
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาโครงการ"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full md:w-auto">
                  <div className="w-full md:w-48">
                    <Select
                      options={typeOptions}
                      value={typeOptions.find((option) => option.value === filterType)}
                      onChange={(option) => {
                        const value = (option?.value || 'all') as 'all' | 'condo' | 'house';
                        setFilterType(value);
                        setCurrentPage(1);
                      }}
                      isClearable={false}
                      classNamePrefix="react-select"
                      placeholder="ประเภท"
                    />
                  </div>
                  <div className="w-full md:w-56">
                    <Select
                      options={statusOptions}
                      value={statusOptions.find((option) => option.value === filterStatus)}
                      onChange={(option) => {
                        const value = (option?.value || 'all') as 'all' | 'undefined' | 'ready' | 'new' | 'sold_out';
                        setFilterStatus(value);
                        setCurrentPage(1);
                      }}
                      isClearable={false}
                      classNamePrefix="react-select"
                      placeholder="สถานะโครงการ"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
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
              No projects found
            </p>
          </div>
        ) : (
          <div id="admin_project_listing" className="overflow-x-auto">
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
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      ไม่พบโครงการที่ตรงกับการค้นหา/ตัวกรอง
                    </td>
                  </tr>
                ) : (
                  pagedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-foreground">
                            {project.name}
                            {project.projectStatus === 'ready' && (
                              <span className="text-xs text-green-500 ml-2 bg-green-500/10 px-2 py-1 rounded-md">พร้อมอยู่</span>
                            )}
                            {project.projectStatus === 'new' && (
                              <span className="text-xs text-blue-500 ml-2 bg-blue-500/10 px-2 py-1 rounded-md">โครงการใหม่</span>
                            )}
                            {project.projectStatus === 'sold_out' && (
                              <span className="text-xs text-muted-foreground ml-2 bg-muted-foreground/10 px-2 py-1 rounded-md">Pre-sale</span>
                            )}
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
                  ))
                )}
              </tbody>
            </table>
            {filteredProjects.length > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border text-sm text-muted-foreground">
                <div>
                  แสดง {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredProjects.length)} จาก {filteredProjects.length} รายการ
                  {filteredProjects.length !== projects.length && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (ทั้งหมด {projects.length})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-3 py-1 text-sm"
                  >
                    ก่อนหน้า
                  </Button>
                  <span>
                    หน้า {safeCurrentPage} จาก {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))}
                    disabled={safeCurrentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 text-sm"
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
