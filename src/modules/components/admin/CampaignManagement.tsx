'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Megaphone, Pencil, CalendarRange, Building2, Home } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Campaign, Project } from '../../types';
import {
  saveCampaign,
  getCampaigns,
  getProjects,
  generateUUID,
} from '../../utils/storage';

export function CampaignManagement() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [promotionImg, setPromotionImg] = useState('');
  const [bannerDesktopUrl, setBannerDesktopUrl] = useState('');
  const [bannerMobileUrl, setBannerMobileUrl] = useState('');
  const [campaignKey, setCampaignKey] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
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
    setBannerDesktopUrl('');
    setBannerMobileUrl('');
    setCampaignKey('');
    setStartAt('');
    setEndAt('');
    setLeadTarget('');
    setBudget('');
    setUtmSource('');
    setUtmMedium('');
    setUtmId('');
    setUtmCampaign('');
    setLandingUrl('');
    setSelectedProjectIds([]);
    setIsFormOpen(false);
  };

  const handleEdit = (campaign: Campaign) => {
    if (!campaign.campaignKey) {
      toast.error('Mission นี้ยังไม่มี Campaign Key');
      return;
    }
    router.push(`/admin/campaigns/${campaign.campaignKey}`);
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const normalizeCampaignKey = (value: string): string =>
    value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async () => {
    if (!name || !detail || !landingUrl || !utmSource || !utmMedium || !utmCampaign || !campaignKey) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (startAt && endAt && startAt > endAt) {
      toast.error('วันเริ่มต้นต้องน้อยกว่าหรือเท่ากับวันสิ้นสุด');
      return;
    }

    try {
      setSaving(true);
      const campaign: Campaign = {
        id: generateUUID(),
        name,
        detail,
        promotionImg: promotionImg || undefined,
        bannerDesktopUrl: bannerDesktopUrl || undefined,
        bannerMobileUrl: bannerMobileUrl || undefined,
        campaignKey: normalizeCampaignKey(campaignKey),
        leadTarget,
        budget: parseFloat(budget) || 0,
        utmSource,
        utmMedium,
        utmId,
        utmCampaign,
        landingUrl,
        projectIds: selectedProjectIds,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(`${endAt}T23:59:59.999Z`).toISOString() : undefined,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      await saveCampaign(campaign);
      await loadData();
      toast.success('เพิ่ม Mission สำเร็จ');
      resetForm();
    } catch (error) {
      console.error('Error saving campaign:', error);
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
          <h2>จัดการ Mission</h2>
          <p className="text-muted-foreground mt-1">
            จัดการ Mission โฆษณาสำหรับ Affiliate
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center gap-2 cursor-pointer ${isFormOpen ? 'hidden' : ''}`}
        >
          <Plus className="w-4 h-4" />
          เพิ่ม Mission
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
          <h3 className="text-primary mb-4">
            เพิ่ม Mission ใหม่
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ชื่อ Mission"
                value={name}
                onChange={setName}
                placeholder="เช่น โปรโมชั่นต้นปี 2024"
                required
              />
              <Input
                label="Mission Key"
                value={campaignKey}
                onChange={setCampaignKey}
                placeholder="เช่น condo-midyear-2026"
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
                รายละเอียด Mission <span className="text-destructive">*</span>
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="รายละเอียดเกี่ยวกับ Mission"
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
                label="Banner Desktop (URL)"
                value={bannerDesktopUrl}
                onChange={setBannerDesktopUrl}
                placeholder="https://example.com/banner-desktop.jpg"
              />
              <Input
                label="Banner Mobile (URL)"
                value={bannerMobileUrl}
                onChange={setBannerMobileUrl}
                placeholder="https://example.com/banner-mobile.jpg"
              />
              <Input
                label="กลุ่มเป้าหมาย"
                value={leadTarget}
                onChange={setLeadTarget}
                placeholder="เช่น คนทำงานออฟฟิศ อายุ 25-35 ปี"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="วันเริ่มต้น"
                type="date"
                value={startAt}
                onChange={setStartAt}
              />
              <Input
                label="วันสิ้นสุด"
                type="date"
                value={endAt}
                onChange={setEndAt}
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
                {saving ? 'กำลังบันทึก...' : 'เพิ่ม Mission'}
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
          <h3 className="text-primary">Mission ทั้งหมด ({campaigns.length})</h3>
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
              ยังไม่มี Mission เพิ่ม Mission แรกของคุณเลย!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    Mission
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground">
                    สถานะ
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
                          <div className="text-xs text-muted-foreground mt-1">
                            key: {campaign.campaignKey || '-'}
                          </div>
                          {(campaign.startAt || campaign.endAt) && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <CalendarRange className="w-3 h-3" />
                              {(campaign.startAt ? campaign.startAt.slice(0, 10) : 'ไม่ระบุ')} - {(campaign.endAt ? campaign.endAt.slice(0, 10) : 'ไม่ระบุ')}
                            </div>
                          )}
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
                        {(campaign.projectIds?.length ?? 0) > 0 ? (
                          <span className="text-primary">
                            {campaign.projectIds.length} โครงการ
                          </span>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        campaign.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {campaign.isActive ? 'Active' : 'Inactive'}
                      </span>
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
