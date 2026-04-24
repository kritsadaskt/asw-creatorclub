'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { AffiliateLink, Project, Campaign } from '../../types';
import { getAffiliateLinksByCreator, getProjects, getCampaigns, updateAffiliateLink } from '../../utils/storage';
import { BASE_PATH } from '@/lib/publicPath';
import { Building2, CalendarIcon, Home, HomeIcon, Link2, Loader2, MousePointerClick, PencilIcon, PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { FaRegTrashAlt } from 'react-icons/fa';

interface AffiliateGeneratorProps {
  creatorId: string;
  showBackButton?: boolean;
}

type ShlinkStatEntry = { total: number; nonBots?: number } | null;

export function AffiliateGenerator({ creatorId, showBackButton = true }: AffiliateGeneratorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedLink, setSelectedLink] = useState<AffiliateLink | null>(null);
  const [draftCampaignName, setDraftCampaignName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftProjectId, setDraftProjectId] = useState<string>('');
  const [draftPostLinks, setDraftPostLinks] = useState<string[]>(['']);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projectCache, setProjectCache] = useState<Record<string, Project>>({});
  const [campaignCache, setCampaignCache] = useState<Record<string, Campaign>>({});
  const [shlinkStats, setShlinkStats] = useState<Record<string, ShlinkStatEntry>>({});
  const [shlinkStatsLoading, setShlinkStatsLoading] = useState(false);
  const [shlinkTotalClicks, setShlinkTotalClicks] = useState(0);
  const router = useRouter();

  const refreshShlinkStats = useCallback(async () => {
    setShlinkStatsLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/affiliate/shlink-stats`, {
        credentials: 'include',
      });
      if (res.status === 503) {
        setShlinkStats({});
        setShlinkTotalClicks(0);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        stats?: Record<string, ShlinkStatEntry>;
        totalClicksAll?: number;
      };
      setShlinkStats(data.stats ?? {});
      setShlinkTotalClicks(
        typeof data.totalClicksAll === 'number' && Number.isFinite(data.totalClicksAll)
          ? data.totalClicksAll
          : 0
      );
    } catch (e) {
      console.error('Error loading Shlink stats:', e);
    } finally {
      setShlinkStatsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
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
    await refreshShlinkStats();
  }, [creatorId, refreshShlinkStats]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedProject = projectFilter === 'all' ? null : projectFilter;

    return links.filter((link) => {
      const project = link.projectId ? projectCache[link.projectId] : undefined;
      const matchesProject = selectedProject === null || link.projectId === selectedProject;
      const matchesSearch =
        !query ||
        link.campaignName.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        (project?.name?.toLowerCase().includes(query) ?? false);

      return matchesProject && matchesSearch;
    });
  }, [links, searchQuery, projectFilter, projectCache]);

  const openDetailDrawer = (link: AffiliateLink) => {
    setSelectedLink(link);
    setDraftCampaignName(link.campaignName);
    setDraftUrl(link.url);
    setDraftProjectId(link.projectId ?? '');
    setDraftPostLinks(link.postLinks && link.postLinks.length > 0 ? link.postLinks : ['']);
    setIsDetailOpen(true);
  };

  const handlePostLinkChange = (index: number, value: string) => {
    setDraftPostLinks((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleAddPostLink = () => {
    setDraftPostLinks((prev) => [...prev, '']);
  };

  const handleRemovePostLink = (index: number) => {
    setDraftPostLinks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handleSaveLink = async () => {
    if (!selectedLink) return;
    if (!draftCampaignName.trim()) {
      toast.error('กรุณากรอกชื่อแคมเปญ');
      return;
    }
    if (!draftUrl.trim()) {
      toast.error('กรุณากรอก URL ปลายทาง');
      return;
    }

    try {
      setSaving(true);
      const normalizedPostLinks = draftPostLinks
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const updatedLink: AffiliateLink = {
        ...selectedLink,
        campaignName: draftCampaignName.trim(),
        url: draftUrl.trim(),
        projectId: draftProjectId || undefined,
        postLinks: normalizedPostLinks,
      };

      await updateAffiliateLink(updatedLink);
      await loadData();
      setSelectedLink(updatedLink);
      toast.success('บันทึกการแก้ไขสำเร็จ!');
    } catch (error) {
      console.error('Error updating link:', error);
      toast.error('ไม่สามารถบันทึกการแก้ไขได้');
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
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2>ลิงค์ Affiliate ของฉัน</h2>
        <Button onClick={() => router.push('/affiliate')} variant="outline">สร้างลิงก์ Affiliate</Button>
      </div>

      {/* Links List */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">ลิงค์ทั้งหมด ({links.length})</h3>
          </div>
          {!loading && links.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MousePointerClick className="w-4 h-4 shrink-0 text-primary" />
              <span>
                คลิกรวม (ลิงก์ Shlink ที่ยืนยันแล้ว):{' '}
                {shlinkStatsLoading ? (
                  <Loader2 className="inline w-3.5 h-3.5 animate-spin align-middle" aria-hidden />
                ) : (
                  <span className="font-semibold text-foreground tabular-nums">
                    {shlinkTotalClicks.toLocaleString('th-TH')}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดข้อมูล...</span>
            </p>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">ยังไม่มีลิงค์</p>
            <Button onClick={() => router.push('/affiliate')} variant="outline">
              สร้างลิงค์แรกของคุณ
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end gap-7 mb-5">
              <div className="flex-1">
                <Input
                  label="ค้นหา"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="ค้นหาจากชื่อแคมเปญ ชื่อโครงการ หรือ URL"
                />
              </div>
              <div className="w-full md:w-[280px]">
                <label className="block text-sm mb-2 text-foreground">โครงการ</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="ทุกโครงการ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกโครงการ</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchQuery.trim() || projectFilter !== 'all') && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setProjectFilter('all');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}

            {filteredLinks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                ไม่พบลิงค์ที่ตรงกับตัวกรอง
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-foreground">ชื่อลิ้งก์</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">โครงการ</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">วันที่สร้าง</th>
                      <th className="px-4 py-3 text-right font-medium text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          จำนวนคลิก
                          {shlinkStatsLoading && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-hidden />
                          )}
                        </span>
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-foreground">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLinks.map((link) => {
                      const project = link.projectId ? projectCache[link.projectId] : null;
                      const campaign = link.campaignId ? campaignCache[link.campaignId] : null;
                      return (
                        <tr key={link.id} className="hover:bg-muted/20">
                          <td className="px-4 py-4">
                            <div className="font-medium text-foreground">{link.campaignName}</div>
                            {campaign?.name && (
                              <div className="text-xs text-muted-foreground mt-1">{campaign.name}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {project ? (
                              <div className="inline-flex items-center gap-1.5 text-sm text-primary bg-primary/5 px-2 py-1 rounded">
                                {project.type === 'condo' ? <Building2 className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
                                <span>{project.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(link.createdAt).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-4 text-sm text-right tabular-nums">
                            {shlinkStatsLoading ? (
                              <span className="text-muted-foreground">…</span>
                            ) : shlinkStats[link.id] != null ? (
                              <span className="font-medium text-foreground">
                                {shlinkStats[link.id]!.total.toLocaleString('th-TH')}
                              </span>
                            ) : (
                              <span
                                className="text-muted-foreground"
                                title="ไม่ใช่ลิงก์ Shlink ของระบบ หรือยังไม่มีข้อมูล / ไม่ผ่านการยืนยัน"
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              onClick={() => openDetailDrawer(link)}
                              variant="ghost"
                              className="cursor-pointer rounded-full p-2"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Drawer
        direction="right"
        open={isDetailOpen && !!selectedLink}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedLink(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className="p-7">
            <DrawerTitle>รายละเอียดลิงค์ Affiliate</DrawerTitle>
            <DrawerDescription>แก้ไขข้อมูลลิงค์ของคุณ แล้วบันทึกการเปลี่ยนแปลง</DrawerDescription>
          </DrawerHeader>

          {selectedLink && (
            <div className="px-7 pb-7 space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-neutral-700 flex items-center gap-2">
                  <HomeIcon className="w-4 h-4" />
                  <span>{draftProjectId ? projectCache[draftProjectId]?.name : ''}</span>
                </h4>
              </div>

              <Input
                label="ชื่อลิงก์"
                value={draftCampaignName}
                onChange={setDraftCampaignName}
                placeholder="กรอกชื่อแคมเปญ"
                required
              />

              <Input
                label="URL"
                value={draftUrl}
                onChange={setDraftUrl}
                placeholder="https://example.com/?ref=..."
                required
              />

              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-muted-foreground shrink-0">คลิกสะสม (Shlink)</span>
                  {shlinkStatsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden />
                  ) : shlinkStats[selectedLink.id] != null ? (
                    <span className="font-semibold tabular-nums text-foreground">
                      {shlinkStats[selectedLink.id]!.total.toLocaleString('th-TH')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                {draftUrl.trim() !== selectedLink.url.trim() && (
                  <p className="text-xs text-amber-700">
                    สถิตินี้อิง URL ที่บันทึกแล้ว — บันทึกเพื่ออัปเดตหลัง Shlink รู้จักลิงก์ใหม่
                  </p>
                )}
              </div>

              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {new Date(selectedLink.createdAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              <div className="h-10"></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="block text-lg text-foreground">ลิงก์โพสต์ของคุณ (สำหรับแอดมินตรวจสอบ)</h4>
                  <Button type="button" variant="outline" onClick={handleAddPostLink} className="cursor-pointer flex items-center gap-2">
                    เพิ่ม
                    <PlusIcon className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {draftPostLinks.map((postLink, index) => (
                    <div key={`post-link-${index}`} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label={`Post Link ${index + 1}`}
                          value={postLink}
                          onChange={(value) => handlePostLinkChange(index, value)}
                          placeholder="https://facebook.com/... หรือ https://tiktok.com/..."
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemovePostLink(index)}
                        className="cursor-pointer rounded-full p-2"
                        disabled={draftPostLinks.length === 1 && !draftPostLinks[0].trim()}
                      >
                        <FaRegTrashAlt className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <div className="w-full flex flex-col md:flex-row gap-2 justify-center">
              <Button onClick={handleSaveLink} disabled={saving} className="cursor-pointer">
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
              <DrawerClose asChild>
                <Button variant="errorTransparent" className="cursor-pointer border-destructive text-destructive">
                  ปิด
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
