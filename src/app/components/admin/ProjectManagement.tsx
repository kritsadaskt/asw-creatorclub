import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Building2, Home, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Project } from '../../types';
import { saveProject, getProjects, deleteProject, generateUUID } from '../../utils/storage';

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

  const handleSubmit = async () => {
    if (!name || !location || !baseUrl) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      const project: Project = {
        id: editingProject?.id || generateUUID(),
        name,
        type,
        location,
        description,
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
    <div className="max-w-7xl mx-auto p-6">
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
          
          <div className="space-y-4">
            <Input
              label="ชื่อโครงการ"
              value={name}
              onChange={setName}
              placeholder="เช่น The Residence Sukhumvit"
              required
            />

            <div>
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

            <Input
              label="ทำเลที่ตั้ง"
              value={location}
              onChange={setLocation}
              placeholder="เช่น สุขุมวิท, กรุงเทพฯ"
              required
            />

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
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    โครงการ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    ประเภท
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    ทำเล
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    URL
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
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
                          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
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
