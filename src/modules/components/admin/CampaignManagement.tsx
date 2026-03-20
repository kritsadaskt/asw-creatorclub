import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Megaphone, Pencil, Trash2, Building2, Home } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Campaign, Project } from '../../types';
import { saveCampaign, getCampaigns, deleteCampaign, getProjects, generateUUID } from '../../utils/storage';

export function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [promotionImg, setPromotionImg] = useState('');
  const [leadTarget, setLeadTarget] = useState('');
  const [budget, setBudget] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmId, setUtmId] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignData, projectData] = await Promise.all([
        getCampaigns(),
        getProjects()
      ]);
      setCampaigns(campaignData);
      setProjects(projectData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDetail('');
    setPromotionImg('');
    setLeadTarget('');
    setBudget('');
    setUtmSource('');
    setUtmMedium('');
    setUtmId('');
    setUtmCampaign('');
    setLandingUrl('');
    setSelectedProjectIds([]);
    setEditingCampaign(null);
    setIsFormOpen(false);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setName(campaign.name);
    setDetail(campaign.detail);
    setPromotionImg(campaign.promotionImg || '');
    setLeadTarget(campaign.leadTarget);
    setBudget(campaign.budget.toString());
    setUtmSource(campaign.utmSource);
    setUtmMedium(campaign.utmMedium);
    setUtmId(campaign.utmId);
    setUtmCampaign(campaign.utmCampaign);
    setLandingUrl(campaign.landingUrl);
    setSelectedProjectIds(campaign.projectIds);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบแคมเปญนี้หรือไม่?')) {
      try {
        await deleteCampaign(id);
        await loadData();
        toast.success('ลบแคมเปญสำเร็จ');
      } catch (error) {
        console.error('Error deleting campaign:', error);
        toast.error('ไม่สามารถลบแคมเปญได้');
      }
    }
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    if (!name || !detail || !landingUrl || !utmSource || !utmMedium || !utmCampaign) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSaving(true);
      const campaign: Campaign = {
        id: editingCampaign?.id || generateUUID(),
        name,
        detail,
        promotionImg: promotionImg || undefined,
        leadTarget,
        budget: parseFloat(budget) || 0,
        utmSource,
        utmMedium,
        utmId,
        utmCampaign,
        landingUrl,
        projectIds: selectedProjectIds,
        createdAt: editingCampaign?.createdAt || new Date().toISOString()
      };

      await saveCampaign(campaign);
      await loadData();
      toast.success(editingCampaign ? 'แก้ไขแคมเปญสำเร็จ' : 'เพิ่มแคมเปญสำเร็จ');
      resetForm();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  // Get project names for display
  const getProjectNames = (projectIds: string[]) => {
    return projectIds
      .map(id => projects.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>จัดการแคมเปญ</h2>
          <p className="text-muted-foreground mt-1">
            จัดการแคมเปญโฆษณาสำหรับ Affiliate
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center gap-2 cursor-pointer ${isFormOpen ? 'hidden' : ''}`}
        >
          <Plus className="w-4 h-4" />
          เพิ่มแคมเปญ
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
          <h3 className="text-primary mb-4">
            {editingCampaign ? 'แก้ไขแคมเปญ' : 'เพิ่มแคมเปญใหม่'}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ชื่อแคมเปญ"
                value={name}
                onChange={setName}
                placeholder="เช่น โปรโมชั่นต้นปี 2024"
                required
              />

              <Input
                label="งบประมาณ (บาท)"
                type="number"
                value={budget}
                onChange={setBudget}
                placeholder="เช่น 100000"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground">
                รายละเอียดแคมเปญ <span className="text-destructive">*</span>
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="รายละเอียดเกี่ยวกับแคมเปญ"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="รูปโปรโมชั่น (URL)"
                value={promotionImg}
                onChange={setPromotionImg}
                placeholder="https://example.com/image.jpg"
              />

              <Input
                label="กลุ่มเป้าหมาย"
                value={leadTarget}
                onChange={setLeadTarget}
                placeholder="เช่น คนทำงานออฟฟิศ อายุ 25-35 ปี"
              />
            </div>

            <Input
              label="URL ปลายทาง"
              value={landingUrl}
              onChange={setLandingUrl}
              placeholder="https://example.com/landing"
              required
            />

            {/* UTM Parameters Section */}
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">UTM Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="UTM Source"
                  value={utmSource}
                  onChange={setUtmSource}
                  placeholder="เช่น facebook, google"
                  required
                />

                <Input
                  label="UTM Medium"
                  value={utmMedium}
                  onChange={setUtmMedium}
                  placeholder="เช่น cpc, social"
                  required
                />

                <Input
                  label="UTM Campaign"
                  value={utmCampaign}
                  onChange={setUtmCampaign}
                  placeholder="เช่น spring_sale_2024"
                  required
                />

                <Input
                  label="UTM ID"
                  value={utmId}
                  onChange={setUtmId}
                  placeholder="เช่น campaign_001"
                />
              </div>
            </div>

            {/* Project Selection */}
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">เลือกโครงการที่เกี่ยวข้อง</h4>
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProjectIds.includes(project.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.includes(project.id)}
                        onChange={() => handleProjectToggle(project.id)}
                        className="w-4 h-4 text-primary rounded"
                      />
                      <div className="flex items-center gap-2">
                        {project.type === 'condo' ? (
                          <Building2 className="w-4 h-4 text-primary" />
                        ) : (
                          <Home className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm">{project.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} fullWidth disabled={saving}>
                {saving ? 'กำลังบันทึก...' : (editingCampaign ? 'บันทึก' : 'เพิ่มแคมเปญ')}
              </Button>
              <Button onClick={resetForm} variant="outline" fullWidth disabled={saving}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-primary">แคมเปญทั้งหมด ({campaigns.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              ยังไม่มีแคมเปญ เพิ่มแคมเปญแรกของคุณเลย!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    แคมเปญ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    กลุ่มเป้าหมาย
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    งบประมาณ
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    โครงการ
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {campaign.promotionImg ? (
                          <img 
                            src={campaign.promotionImg} 
                            alt={campaign.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Megaphone className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {campaign.detail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {campaign.leadTarget || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">
                        {campaign.budget.toLocaleString()} บาท
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {campaign.projectIds.length > 0 ? (
                          <span className="text-primary">
                            {campaign.projectIds.length} โครงการ
                          </span>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(campaign)}
                          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.id)}
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
