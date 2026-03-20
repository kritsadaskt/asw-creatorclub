'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { AffiliateLink, Project, Campaign } from '../../types';
import { getAffiliateLinksByCreator, getProjects, getCampaigns, saveAffiliateLink, generateUUID } from '../../utils/storage';
import { Building2, Home, Megaphone, Link2, Plus, Loader2 } from 'lucide-react';

interface AffiliateGeneratorProps {
  creatorId: string;
  showBackButton?: boolean;
}

export function AffiliateGenerator({ creatorId, showBackButton = true }: AffiliateGeneratorProps) {
  const [campaignName, setCampaignName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Cache project and campaign data for display
  const [projectCache, setProjectCache] = useState<Record<string, Project>>({});
  const [campaignCache, setCampaignCache] = useState<Record<string, Campaign>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [creatorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [creatorLinks, allProjects, allCampaigns] = await Promise.all([
        getAffiliateLinksByCreator(creatorId),
        getProjects(),
        getCampaigns()
      ]);
      setLinks(creatorLinks);
      setProjects(allProjects);
      // Build project cache
      const pCache: Record<string, Project> = {};
      allProjects.forEach(p => { pCache[p.id] = p; });
      setProjectCache(pCache);
      // Build campaign cache
      const cCache: Record<string, Campaign> = {};
      allCampaigns.forEach(c => { cCache[c.id] = c; });
      setCampaignCache(cCache);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project?.baseUrl) {
      setBaseUrl(project.baseUrl);
    } else if (!projectId) {
      setBaseUrl('');
    }
  };

  const generateLink = async () => {
    if (!campaignName.trim()) {
      toast.error('กรุณากรอกชื่อแคมเปญ');
      return;
    }
    if (!baseUrl.trim()) {
      toast.error('กรุณากรอก URL ปลายทาง');
      return;
    }
    try {
      setSaving(true);
      const affiliateCode = `${creatorId}_${Date.now()}`;
      const separator = baseUrl.includes('?') ? '&' : '?';
      const generatedUrl = `${baseUrl}${separator}ref=${affiliateCode}`;
      const newLink: AffiliateLink = {
        id: generateUUID(),
        creatorId,
        campaignName: campaignName.trim(),
        projectId: selectedProjectId || undefined,
        url: generatedUrl,
        createdAt: new Date().toISOString()
      };
      await saveAffiliateLink(newLink);
      await loadData();
      setCampaignName('');
      setBaseUrl('');
      setSelectedProjectId('');
      toast.success('สร้างลิงค์สำเร็จ!');
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('ไม่สามารถสร้างลิงค์ได้');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-0 py-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2>สร้าง Affiliate Link</h2>
        {showBackButton && (
          <Button onClick={() => router.push('/profile')} variant="outline">
            กลับไปโปรไฟล์
          </Button>
        )}
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-xl shadow-sm border border-border px-4 py-4 md:p-6 mb-6">
        <h3 className="text-primary mb-4">สร้างลิงค์ใหม่</h3>
        
        <div className="space-y-4">
          <Input
            label="ชื่อแคมเปญ"
            value={campaignName}
            onChange={setCampaignName}
            placeholder="เช่น โปรโมชั่นสินค้า A"
            required
          />

          <div>
            <label className="block text-sm mb-2 text-foreground">
              เลือกโครงการ (ไม่บังคับ)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">ไม่เลือก - ใช้ URL กำหนดเอง</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.type === 'condo' ? '🏢' : '🏠'} {project.name} - {project.location}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="URL ปลายทาง"
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder="https://example.com/product"
            required
          />

          <Button onClick={generateLink} fullWidth disabled={saving} className="flex items-center justify-center cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            {saving ? 'Generating...' : 'Create Link'}
          </Button>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ลิงค์ทั้งหมด ({links.length})</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">ยังไม่มีลิงค์</p>
            <Button onClick={() => router.push('/affiliate')} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              สร้างลิงค์แรกของคุณ
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const project = link.projectId ? projectCache[link.projectId] : null;
              const campaign = link.campaignId ? campaignCache[link.campaignId] : null;
              return (
                <div
                  key={link.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground mb-1">{link.campaignName}</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {project && (
                          <div className="text-sm text-primary flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded">
                            {project.type === 'condo' ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                            <span>{project.name}</span>
                          </div>
                        )}
                        {campaign && (
                          <div className="text-sm text-accent flex items-center gap-1 bg-accent/5 px-2 py-0.5 rounded">
                            <Megaphone className="w-3 h-3" />
                            <span>{campaign.name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground break-all">
                        {link.url}
                      </p>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      variant="outline"
                      className="ml-4 flex-shrink-0"
                    >
                      {copiedId === link.id ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    สร้างเมื่อ: {new Date(link.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
