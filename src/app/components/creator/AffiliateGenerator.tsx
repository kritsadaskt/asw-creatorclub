import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { AffiliateLink, Project } from '../../types';
import { saveAffiliateLink, getAffiliateLinksByCreator, getProjects, getProjectById, generateUUID } from '../../utils/storage';
import { Building2, Home } from 'lucide-react';

interface AffiliateGeneratorProps {
  creatorId: string;
}

export function AffiliateGenerator({ creatorId }: AffiliateGeneratorProps) {
  const [campaignName, setCampaignName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Cache project data for display
  const [projectCache, setProjectCache] = useState<Record<string, Project>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [creatorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [creatorLinks, allProjects] = await Promise.all([
        getAffiliateLinksByCreator(creatorId),
        getProjects()
      ]);
      setLinks(creatorLinks);
      setProjects(allProjects);
      // Build project cache
      const cache: Record<string, Project> = {};
      allProjects.forEach(p => { cache[p.id] = p; });
      setProjectCache(cache);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      try {
        const project = await getProjectById(projectId);
        if (project) {
          setBaseUrl(project.baseUrl);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      }
    } else {
      setBaseUrl('');
    }
  };

  const generateLink = async () => {
    if (!campaignName || !baseUrl) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
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
        campaignName,
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2>สร้าง Affiliate Link</h2>
        <Button onClick={() => navigate('../profile')} variant="outline">
          กลับไปโปรไฟล์
        </Button>
      </div>

      {/* Generator Form */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
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

          <Button onClick={generateLink} fullWidth disabled={saving}>
            {saving ? 'กำลังสร้าง...' : 'สร้างลิงค์'}
          </Button>
        </div>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-primary mb-4">ลิงค์ของฉัน ({links.length})</h3>
        
        {loading ? (
          <p className="text-muted-foreground text-center py-8">
            กำลังโหลดข้อมูล...
          </p>
        ) : links.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ยังไม่มีลิงค์ สร้างลิงค์แรกของคุณเลย!
          </p>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const project = link.projectId ? projectCache[link.projectId] : null;
              return (
                <div
                  key={link.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="text-foreground mb-1">{link.campaignName}</h4>
                      {project && (
                        <div className="text-sm text-primary mb-1 flex items-center gap-1">
                          {project.type === 'condo' ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                          <span>{project.name}</span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground break-all">
                        {link.url}
                      </p>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      variant="outline"
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
