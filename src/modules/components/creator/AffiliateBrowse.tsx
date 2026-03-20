'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Home, Megaphone, X, Link2, Copy, Check } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { Project, Campaign, AffiliateLink } from '../../types';
import { 
  getProjects, 
  getCampaigns, 
  getCampaignsByProjectId,
  saveAffiliateLink, 
  generateUUID 
} from '../../utils/storage';

interface AffiliateBrowseProps {
  creatorId: string;
}

type TabType = 'projects' | 'campaigns';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  campaign?: Campaign;
  creatorId: string;
  onSuccess: () => void;
}

function CreateLinkModal({ isOpen, onClose, project, campaign, creatorId, onSuccess }: CreateLinkModalProps) {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setGeneratedLink(null);
      setCopied(false);
      
      if (campaign) {
        // Pre-fill with campaign name
        setCampaignName(campaign.name);
        setSelectedCampaignId('');
        setAvailableCampaigns([]);
      } else if (project) {
        setCampaignName('');
        setSelectedCampaignId('');
        // Load campaigns for this project
        loadCampaignsForProject(project.id);
      }
    }
  }, [isOpen, project, campaign]);

  const loadCampaignsForProject = async (projectId: string) => {
    try {
      const campaigns = await getCampaignsByProjectId(projectId);
      setAvailableCampaigns(campaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    if (campaignId) {
      const selected = availableCampaigns.find(c => c.id === campaignId);
      if (selected && !campaignName) {
        setCampaignName(selected.name);
      }
    }
  };

  const generateLink = async () => {
    if (!campaignName) {
      toast.error('กรุณากรอกชื่อแคมเปญ');
      return;
    }

    try {
      setSaving(true);
      
      let baseUrl = '';
      let finalCampaignId: string | undefined;

      if (campaign) {
        // Using campaign directly
        const url = new URL(campaign.landingUrl);
        if (campaign.utmSource) url.searchParams.set('utm_source', campaign.utmSource);
        if (campaign.utmMedium) url.searchParams.set('utm_medium', campaign.utmMedium);
        if (campaign.utmCampaign) url.searchParams.set('utm_campaign', campaign.utmCampaign);
        if (campaign.utmId) url.searchParams.set('utm_id', campaign.utmId);
        baseUrl = url.toString();
        finalCampaignId = campaign.id;
      } else if (project) {
        // Using project, optionally with a campaign
        if (selectedCampaignId) {
          const selectedCampaign = availableCampaigns.find(c => c.id === selectedCampaignId);
          if (selectedCampaign) {
            const url = new URL(selectedCampaign.landingUrl);
            if (selectedCampaign.utmSource) url.searchParams.set('utm_source', selectedCampaign.utmSource);
            if (selectedCampaign.utmMedium) url.searchParams.set('utm_medium', selectedCampaign.utmMedium);
            if (selectedCampaign.utmCampaign) url.searchParams.set('utm_campaign', selectedCampaign.utmCampaign);
            if (selectedCampaign.utmId) url.searchParams.set('utm_id', selectedCampaign.utmId);
            baseUrl = url.toString();
            finalCampaignId = selectedCampaign.id;
          }
        } else {
          baseUrl = project.baseUrl;
        }
      }

      const affiliateCode = `${creatorId}_${Date.now()}`;
      const separator = baseUrl.includes('?') ? '&' : '?';
      const generatedUrl = `${baseUrl}${separator}ref=${affiliateCode}`;

      const newLink: AffiliateLink = {
        id: generateUUID(),
        creatorId,
        campaignName,
        projectId: project?.id,
        campaignId: finalCampaignId,
        url: generatedUrl,
        createdAt: new Date().toISOString()
      };

      await saveAffiliateLink(newLink);
      setGeneratedLink(generatedUrl);
      toast.success('สร้างลิงค์สำเร็จ!');
      onSuccess();
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('ไม่สามารถสร้างลิงค์ได้');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToMyLinks = () => {
    onClose();
    router.push('/profile/affiliate');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {generatedLink ? 'ลิงค์ของคุณ' : 'สร้าง Affiliate Link'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {generatedLink ? (
          // Success state - show generated link
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Affiliate Link</span>
              </div>
              <p className="text-sm text-muted-foreground break-all">{generatedLink}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={copyToClipboard} fullWidth variant={copied ? 'secondary' : 'primary'}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    คัดลอกลิงค์
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button onClick={goToMyLinks} variant="outline" fullWidth>
                ดูลิงค์ทั้งหมด
              </Button>
              <Button onClick={onClose} variant="outline" fullWidth>
                ปิด
              </Button>
            </div>
          </div>
        ) : (
          // Form state
          <div className="space-y-4">
            {/* Show what they selected */}
            <div className="p-3 bg-muted/30 rounded-lg">
              {campaign ? (
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">แคมเปญ</p>
                  </div>
                </div>
              ) : project ? (
                <div className="flex items-center gap-2">
                  {project.type === 'condo' ? (
                    <Building2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Home className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.location}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <Input
              label="ชื่อแคมเปญของคุณ"
              value={campaignName}
              onChange={setCampaignName}
              placeholder="เช่น โปรโมชั่นเดือนนี้"
              required
            />

            {/* Campaign selection for projects */}
            {project && availableCampaigns.length > 0 && (
              <div>
                <label className="block text-sm mb-2 text-foreground">
                  เลือกแคมเปญ (ไม่บังคับ)
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => handleCampaignSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">ไม่เลือก - ใช้ URL โครงการ</option>
                  {availableCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={generateLink} fullWidth disabled={saving}>
                {saving ? 'กำลังสร้าง...' : 'สร้างลิงค์'}
              </Button>
              <Button onClick={onClose} variant="outline" fullWidth disabled={saving}>
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AffiliateBrowse({ creatorId }: AffiliateBrowseProps) {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectData, campaignData] = await Promise.all([
        getProjects(),
        getCampaigns()
      ]);
      setProjects(projectData);
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromProject = (project: Project) => {
    setSelectedProject(project);
    setSelectedCampaign(undefined);
    setModalOpen(true);
  };

  const handleCreateFromCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedProject(undefined);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProject(undefined);
    setSelectedCampaign(undefined);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">สร้าง Affiliate Link</h2>
        <p className="text-muted-foreground mt-1">
          เลือกโครงการหรือแคมเปญเพื่อสร้างลิงค์ Affiliate ของคุณ
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-primary text-white'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            โครงการ ({projects.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'campaigns'
              ? 'bg-primary text-white'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            แคมเปญ ({campaigns.length})
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      ) : activeTab === 'projects' ? (
        // Projects Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ยังไม่มีโครงการ</p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {project.type === 'condo' ? (
                        <Building2 className="w-6 h-6 text-primary" />
                      ) : (
                        <Home className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.location}</p>
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {project.type === 'condo' ? 'คอนโด' : 'บ้าน'}
                      </span>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <Button
                    onClick={() => handleCreateFromProject(project)}
                    fullWidth
                    variant="outline"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    สร้างลิงค์
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Campaigns Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ยังไม่มีแคมเปญ</p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {campaign.promotionImg && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={campaign.promotionImg}
                      alt={campaign.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {!campaign.promotionImg && (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{campaign.name}</h3>
                      {campaign.leadTarget && (
                        <p className="text-sm text-muted-foreground">
                          กลุ่มเป้าหมาย: {campaign.leadTarget}
                        </p>
                      )}
                      {campaign.budget > 0 && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          งบ {campaign.budget.toLocaleString()} บาท
                        </span>
                      )}
                    </div>
                  </div>
                  {campaign.detail && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {campaign.detail}
                    </p>
                  )}
                  <Button
                    onClick={() => handleCreateFromCampaign(campaign)}
                    fullWidth
                    variant="outline"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    สร้างลิงค์
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Link Modal */}
      <CreateLinkModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        project={selectedProject}
        campaign={selectedCampaign}
        creatorId={creatorId}
        onSuccess={loadData}
      />
    </div>
  );
}
