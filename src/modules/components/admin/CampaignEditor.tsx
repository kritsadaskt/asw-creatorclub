'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GripVertical, LinkIcon, Loader2, MousePointerClick, Plus, User, X } from 'lucide-react';
import { toast } from 'sonner';
import Select, { type StylesConfig } from 'react-select';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { FaFacebook, FaInstagram, FaPhone, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import type { AffiliateLink, Campaign, CreatorProfile, Project } from '../../types';
import {
  getAffiliateLinksByCreatorAndCampaign,
  getCampaignByKey,
  getCreatorById,
  getProjects,
  saveCampaign,
} from '../../utils/storage';
import type { ShlinkVisitStats } from '@/lib/shlink-server';
import { CreatorBadge } from '../ui/creator-badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getProfileImageUrl } from '../../utils/profileImage';
import { Lemon8Icon } from '@/modules/utils/svg';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';

type CampaignEditorProps = {
  campaignKey: string;
};

type ProjectSelectOption = {
  value: string;
  label: string;
};

type SocialPlatform = keyof CreatorProfile['socialAccounts'];

const SOCIAL_ICON_MAP: Record<SocialPlatform, ReactNode> = {
  facebook: <FaFacebook className="h-4 w-4 text-[#1877F2]" />,
  instagram: <FaInstagram className="h-4 w-4 text-pink-500" />,
  tiktok: <FaTiktok className="h-4 w-4 text-black" />,
  youtube: <FaYoutube className="h-4 w-4 text-red-600" />,
  twitter: <FaXTwitter className="h-4 w-4 text-black" />,
  lemon8: <Lemon8Icon className="h-4 w-4 text-yellow-500" />,
};

function socialList(
  socialAccounts: CreatorProfile['socialAccounts'],
  followerCounts: CreatorProfile['followerCounts'],
) {
  const items = (Object.entries(socialAccounts) as Array<[SocialPlatform, string | undefined]>).filter(
    ([, url]) => Boolean(url),
  );
  if (items.length === 0) {
    return <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([platform, url]) => {
        const followers = followerCounts?.[platform];
        const followerLabel =
          typeof followers === 'number' && Number.isFinite(followers) ? followers.toLocaleString() : 'ไม่ระบุ';
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:bg-muted/50"
            aria-label={platform}
            title={platform}
          >
            {SOCIAL_ICON_MAP[platform]}
            <span className="text-foreground">{followerLabel}</span>
          </a>
        );
      })}
    </div>
  );
}

function isAswHouseholdType(typeRaw: string | undefined): boolean {
  const type = (typeRaw ?? '').trim().toLowerCase();
  return type === 'asw_household' || type === 'asw_houshold';
}

const projectSelectStyles: StylesConfig<ProjectSelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 10,
    borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
    boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.15)' : 'none',
    '&:hover': {
      borderColor: 'hsl(var(--primary) / 0.7)',
    },
  }),
  valueContainer: (base) => ({ ...base, padding: '6px 10px' }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 60,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 14px 30px rgba(2, 6, 23, 0.12)',
  }),
};

export function CampaignEditor({ campaignKey }: CampaignEditorProps) {
  const router = useRouter();
  const API_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const [name, setName] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [promotionImg, setPromotionImg] = useState('');
  const [bannerDesktopUrl, setBannerDesktopUrl] = useState('');
  const [bannerMobileUrl, setBannerMobileUrl] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [leadTarget, setLeadTarget] = useState('');
  const [budget, setBudget] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmId, setUtmId] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [materialsUrl, setMaterialsUrl] = useState('');
  const [termsUrl, setTermsUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectToAdd, setProjectToAdd] = useState<ProjectSelectOption | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [isCreatorDrawerOpen, setIsCreatorDrawerOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [creatorMissionLinks, setCreatorMissionLinks] = useState<AffiliateLink[]>([]);
  const [missionLinksLoading, setMissionLinksLoading] = useState(false);
  const [missionLinkClicks, setMissionLinkClicks] = useState<Record<string, ShlinkVisitStats | null>>({});
  const [missionLinkClicksLoading, setMissionLinkClicksLoading] = useState(false);
  const [report, setReport] = useState<{
    linkCount: number;
    creatorCount: number;
    projectCount: number;
    totalClicks: number | null;
    shlinkConfigured: boolean;
    statsSyncedAt?: string | null;
    topCreators: Array<{
      creatorId: string;
      displayName: string;
      inviteType: string;
      linkCount: number;
    }>;
    topLinks: Array<{
      affiliateLinkId: string;
      shortUrl: string;
      projectName: string;
      creatorId: string | null;
      creatorDisplayName: string;
      clicks: number | null;
    }>;
  } | null>(null);

  const projectOptions: ProjectSelectOption[] = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  const selectedProjectOptions = selectedProjectIds
    .map((id) => projectOptions.find((option) => option.value === id))
    .filter((option): option is ProjectSelectOption => Boolean(option));

  const availableProjectOptions = projectOptions.filter(
    (option) => !selectedProjectIds.includes(option.value),
  );

  const handleAddProject = () => {
    if (!projectToAdd) return;
    setSelectedProjectIds((prev) => [...prev, projectToAdd.value]);
    setProjectToAdd(null);
  };

  const openCreatorDrawer = async (creatorId: string | null) => {
    if (!creatorId) return;
    try {
      setCreatorLoading(true);
      setIsCreatorDrawerOpen(true);
      setCreatorMissionLinks([]);
      setMissionLinkClicks({});
      const creator = await getCreatorById(creatorId);
      if (!creator) {
        toast.error('ไม่พบข้อมูลครีเอเตอร์');
        setSelectedCreator(null);
        return;
      }
      setSelectedCreator(creator);
    } catch (error) {
      console.error('Error loading creator detail:', error);
      toast.error('ไม่สามารถโหลดข้อมูลครีเอเตอร์ได้');
      setSelectedCreator(null);
    } finally {
      setCreatorLoading(false);
    }
  };

  useEffect(() => {
    const loadCreatorMissionLinks = async () => {
      if (!selectedCreator || !campaign?.id) {
        setCreatorMissionLinks([]);
        setMissionLinkClicks({});
        return;
      }

      try {
        setMissionLinksLoading(true);
        setMissionLinkClicksLoading(true);
        const [links, clickStatsRes] = await Promise.all([
          getAffiliateLinksByCreatorAndCampaign(selectedCreator.id, campaign.id),
          fetch(`${API_BASE_PATH}/api/admin/creators/${selectedCreator.id}/affiliate-clicks`, {
            credentials: 'same-origin',
          }),
        ]);
        setCreatorMissionLinks(links);

        const clickStatsJson = (await clickStatsRes.json().catch(() => ({}))) as {
          stats?: Record<string, ShlinkVisitStats | null>;
        };
        if (clickStatsRes.ok) {
          const linkIds = new Set(links.map((link) => link.id));
          const filteredStats: Record<string, ShlinkVisitStats | null> = {};
          for (const [linkId, stats] of Object.entries(clickStatsJson.stats ?? {})) {
            if (linkIds.has(linkId)) {
              filteredStats[linkId] = stats;
            }
          }
          setMissionLinkClicks(filteredStats);
        } else {
          setMissionLinkClicks({});
        }
      } catch (error) {
        console.error('Error loading creator mission links:', error);
        toast.error('ไม่สามารถโหลดลิงก์ใน Mission นี้ได้');
        setCreatorMissionLinks([]);
        setMissionLinkClicks({});
      } finally {
        setMissionLinksLoading(false);
        setMissionLinkClicksLoading(false);
      }
    };

    void loadCreatorMissionLinks();
  }, [API_BASE_PATH, campaign?.id, selectedCreator]);

  const removeSelectedProject = (projectId: string) => {
    setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId));
  };

  const reorderProject = (draggedId: string, targetId: string) => {
    setSelectedProjectIds((prev) => {
      const fromIndex = prev.indexOf(draggedId);
      const toIndex = prev.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const loadReport = useCallback(async (campaignId: string) => {
    try {
      setReportLoading(true);
      const res = await fetch(`${API_BASE_PATH}/api/admin/campaigns/${campaignId}/report`);
      if (!res.ok) {
        throw new Error('Failed to load campaign report');
      }
      const data = await res.json();
      setReport({
        linkCount: Number(data.linkCount ?? 0),
        creatorCount: Number(data.creatorCount ?? 0),
        projectCount: Number(data.projectCount ?? 0),
        totalClicks: typeof data.totalClicks === 'number' ? data.totalClicks : null,
        shlinkConfigured: Boolean(data.shlinkConfigured),
        statsSyncedAt: typeof data.statsSyncedAt === 'string' ? data.statsSyncedAt : null,
        topCreators: Array.isArray(data.topCreators) ? data.topCreators : [],
        topLinks: Array.isArray(data.topLinks) ? data.topLinks : [],
      });
    } catch (error) {
      console.error('Error loading campaign report:', error);
      toast.error('ไม่สามารถโหลดรายงาน Mission ได้');
    } finally {
      setReportLoading(false);
    }
  }, [API_BASE_PATH]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [campaignData, projectData] = await Promise.all([getCampaignByKey(campaignKey), getProjects()]);
        if (!campaignData) {
          toast.error('ไม่พบ Mission ที่ต้องการแก้ไข');
          router.replace('/admin/campaigns');
          return;
        }
        setCampaign(campaignData);
        setProjects(projectData);
        setName(campaignData.name);
        setSubTitle(campaignData.subTitle || '');
        setDetail(campaignData.detail);
        setPromotionImg(campaignData.promotionImg || '');
        setBannerDesktopUrl(campaignData.bannerDesktopUrl || '');
        setBannerMobileUrl(campaignData.bannerMobileUrl || '');
        setStartAt(campaignData.startAt ? campaignData.startAt.slice(0, 10) : '');
        setEndAt(campaignData.endAt ? campaignData.endAt.slice(0, 10) : '');
        setLeadTarget(campaignData.leadTarget);
        setBudget(campaignData.budget.toString());
        setUtmSource(campaignData.utmSource);
        setUtmMedium(campaignData.utmMedium);
        setUtmId(campaignData.utmId);
        setUtmCampaign(campaignData.utmCampaign);
        setLandingUrl(campaignData.landingUrl);
        setMaterialsUrl(campaignData.materialsUrl || '');
        setTermsUrl(campaignData.termsUrl || '');
        setIsActive(campaignData.isActive ?? true);
        setSelectedProjectIds(campaignData.projectIds ?? []);
        await loadReport(campaignData.id);
      } catch (error) {
        console.error('Error loading campaign editor:', error);
        toast.error('ไม่สามารถโหลดข้อมูล Mission ได้');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [campaignKey, loadReport, router]);

  const handleSave = async () => {
    if (!campaign) return;
    if (!name || !landingUrl || !utmSource || !utmMedium || !utmCampaign) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (startAt && endAt && startAt > endAt) {
      toast.error('วันเริ่มต้นต้องน้อยกว่าหรือเท่ากับวันสิ้นสุด');
      return;
    }

    try {
      setSaving(true);
      await saveCampaign({
        ...campaign,
        name,
        subTitle: subTitle || undefined,
        detail,
        promotionImg: promotionImg || undefined,
        bannerDesktopUrl: bannerDesktopUrl || undefined,
        bannerMobileUrl: bannerMobileUrl || undefined,
        leadTarget,
        budget: Number.parseFloat(budget) || 0,
        utmSource,
        utmMedium,
        utmId,
        utmCampaign,
        landingUrl,
        materialsUrl: materialsUrl || undefined,
        termsUrl: termsUrl || undefined,
        isActive,
        projectIds: selectedProjectIds,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(`${endAt}T23:59:59.999Z`).toISOString() : undefined,
      });
      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              name,
              subTitle: subTitle || undefined,
              detail,
              promotionImg: promotionImg || undefined,
              bannerDesktopUrl: bannerDesktopUrl || undefined,
              bannerMobileUrl: bannerMobileUrl || undefined,
              leadTarget,
              budget: Number.parseFloat(budget) || 0,
              utmSource,
              utmMedium,
              utmId,
              utmCampaign,
              landingUrl,
              materialsUrl: materialsUrl || undefined,
              termsUrl: termsUrl || undefined,
              isActive,
              projectIds: selectedProjectIds,
              startAt: startAt ? new Date(startAt).toISOString() : undefined,
              endAt: endAt ? new Date(`${endAt}T23:59:59.999Z`).toISOString() : undefined,
            }
          : prev,
      );
      toast.success('แก้ไข Mission สำเร็จ');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-6 text-muted-foreground">กำลังโหลดข้อมูล Mission...</div>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้ารวม Mission
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-primary">รายงาน Mission</h3>
          <Button
            onClick={() => void loadReport(campaign.id)}
            variant="outline"
            disabled={reportLoading}
            className="w-auto"
          >
            {reportLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลด...
              </span>
            ) : (
              'รีเฟรชรายงาน'
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Links</p>
            <p className="text-xl font-semibold">{(report?.linkCount ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Creators</p>
            <p className="text-xl font-semibold">{(report?.creatorCount ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Projects</p>
            <p className="text-xl font-semibold">{(report?.projectCount ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Clicks</p>
            <p className="text-xl font-semibold">
              {report?.totalClicks == null ? 'N/A' : report.totalClicks.toLocaleString()}
            </p>
          </div>
        </div>
        {report && formatStatsSyncedAtBangkok(report.statsSyncedAt ?? null) && (
          <p className="text-xs text-muted-foreground mb-3">
            ยอดคลิกอ้างอิงจาก Shlink ที่ sync ล่าสุด: {formatStatsSyncedAtBangkok(report.statsSyncedAt ?? null)} (เวลาไทย)
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <h4 className="text-sm font-medium text-foreground mb-3">
              10 อันดับครีเอเตอร์ที่สร้างลิงก์ใน Mission มากที่สุด
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium w-10">#</th>
                  <th className="py-2 pr-3 font-medium">ชื่อ</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 font-medium text-right whitespace-nowrap">จำนวนลิงก์</th>
                </tr>
              </thead>
              <tbody>
                {(report?.topCreators ?? []).map((row, idx) => (
                  <tr key={row.creatorId} className="border-b border-border/80">
                    <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-3 text-foreground">
                      <button
                        type="button"
                        onClick={() => void openCreatorDrawer(row.creatorId)}
                        className="text-primary hover:underline underline-offset-2"
                        title={`ดูรายละเอียดครีเอเตอร์ ${row.displayName}`}
                      >
                        {row.displayName}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3">
                      <CreatorBadge type={row.inviteType} />
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{row.linkCount.toLocaleString()}</td>
                  </tr>
                ))}
                {(report?.topCreators?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <h4 className="text-sm font-medium text-foreground mb-3">
              10 อันดับลิงก์ที่มียอดคลิกสูงสุด
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium w-10">#</th>
                  <th className="py-2 pr-3 font-medium">ลิงก์</th>
                  <th className="py-2 pr-3 font-medium">โครงการ</th>
                  <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">จำนวนคลิก</th>
                  <th className="py-2 font-medium text-center whitespace-nowrap">Creator</th>
                </tr>
              </thead>
              <tbody>
                {(report?.topLinks ?? []).map((row, idx) => (
                  <tr key={row.affiliateLinkId} className="border-b border-border/80">
                    <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-3 text-foreground max-w-[220px] truncate">
                      <a
                        href={row.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline underline-offset-2"
                        title={row.shortUrl}
                      >
                        {row.shortUrl}
                      </a>
                    </td>
                    <td className="py-2.5 pr-3">{row.projectName}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                      {row.clicks == null ? 'N/A' : row.clicks.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => void openCreatorDrawer(row.creatorId)}
                        className="inline-flex text-primary hover:text-primary/80"
                        title={`ดูรายละเอียดครีเอเตอร์ ${row.creatorDisplayName}`}
                      >
                        <User className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(report?.topLinks?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">ยังไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {report && !report.shlinkConfigured && (
          <p className="text-xs text-muted-foreground mt-3">
            ระบบ Shlink ยังไม่ถูกตั้งค่า จึงแสดง Clicks เป็น N/A
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-primary">แก้ไข Mission: {campaign.name}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">สถานะ Mission</span>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                isActive ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              title={isActive ? 'Active' : 'Inactive'}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-gray-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="ชื่อ Mission" value={name} onChange={setName} required />
            <Input label="Mission Key" value={campaign.campaignKey ?? campaignKey} onChange={() => {}} disabled />
            <Input label="Sub Title" value={subTitle} onChange={setSubTitle} placeholder="หัวข้อรอง (ไม่บังคับ)" />
            <Input label="งบประมาณ (บาท)" type="number" value={budget} onChange={setBudget} />
            <Input label="กลุ่มเป้าหมาย" value={leadTarget} onChange={setLeadTarget} />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">เลือกโครงการที่เกี่ยวข้อง</h4>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="flex-1">
                <Select<ProjectSelectOption, false>
                  options={availableProjectOptions}
                  value={projectToAdd}
                  onChange={(option) => setProjectToAdd(option)}
                  placeholder="ค้นหาโครงการที่ต้องการเพิ่ม"
                  styles={projectSelectStyles}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
                  isClearable
                  noOptionsMessage={() => 'ไม่พบโครงการ หรือถูกเพิ่มแล้ว'}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddProject}
                disabled={!projectToAdd}
                className="w-auto md:min-w-28 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                เพิ่ม
              </Button>
            </div>
            {selectedProjectOptions.length > 0 && (
              <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Listed Projects (ลากเพื่อปรับลำดับ)
                </p>
                <div className="space-y-2">
                  {selectedProjectOptions.map((option, index) => (
                    <div
                      key={option.value}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/project-id', option.value);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/project-id');
                        if (draggedId) reorderProject(draggedId, option.value);
                      }}
                      className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-sm flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground mr-2">{index + 1}.</span>
                        <span className="text-foreground">{option.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedProject(option.value)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                        title="ลบออก"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2 text-foreground">
              รายละเอียด Mission (HTML)
            </label>
            <div className="relative rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border">
                <code className="text-xs text-muted-foreground">HTML</code>
              </div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="w-full px-4 py-3 font-mono text-sm bg-gray-950 text-gray-100 focus:outline-none resize-y min-h-[160px]"
                rows={8}
                spellCheck={false}
                placeholder="<div>เนื้อหา HTML ที่ต้องการแสดงในหน้า Mission</div>"
              />
            </div>
            {detail && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">ดูตัวอย่าง Preview</summary>
                <div
                  className="mt-2 p-4 border border-border rounded-lg bg-white prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: detail }}
                />
              </details>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="รูปโปรโมชั่น (URL)" value={promotionImg} onChange={setPromotionImg} />
            <Input label="Banner Desktop (URL)" value={bannerDesktopUrl} onChange={setBannerDesktopUrl} />
            <Input label="Banner Mobile (URL)" value={bannerMobileUrl} onChange={setBannerMobileUrl} />
            <Input label="URL ปลายทาง" value={landingUrl} onChange={setLandingUrl} required />
            <Input label="Materials URL (ลิงก์ดาวน์โหลดไฟล์)" value={materialsUrl} onChange={setMaterialsUrl} placeholder="https://drive.google.com/..." />
            <Input label="Link ข้อกำหนดและเงื่อนไข" value={termsUrl} onChange={setTermsUrl} placeholder="ถ้าไม่ระบุจะใช้ลิงก์ default" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="วันเริ่มต้น" type="date" value={startAt} onChange={setStartAt} />
            <Input label="วันสิ้นสุด" type="date" value={endAt} onChange={setEndAt} />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-3">UTM Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="UTM Source" value={utmSource} onChange={setUtmSource} required />
              <Input label="UTM Medium" value={utmMedium} onChange={setUtmMedium} required />
              <Input label="UTM Campaign" value={utmCampaign} onChange={setUtmCampaign} required />
              <Input label="UTM ID" value={utmId} onChange={setUtmId} />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </Button>
            <Button onClick={() => router.push('/admin/campaigns')} variant="outline" fullWidth disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>

      <Drawer
        direction="right"
        open={isCreatorDrawerOpen}
        onOpenChange={(open) => {
          setIsCreatorDrawerOpen(open);
          if (!open) {
            setSelectedCreator(null);
            setCreatorMissionLinks([]);
            setMissionLinkClicks({});
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className="p-7">
            <DrawerTitle>รายละเอียดครีเอเตอร์</DrawerTitle>
            <DrawerDescription>ข้อมูลผู้สร้างลิงก์ใน Mission นี้</DrawerDescription>
          </DrawerHeader>
          <div className="px-7 pb-7 space-y-3 overflow-y-auto">
            {creatorLoading ? (
              <div className="text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดข้อมูล...
              </div>
            ) : selectedCreator ? (
              <>
                <div className="flex justify-center mb-2">
                  {getProfileImageUrl(selectedCreator) ? (
                    <ImageWithFallback
                      src={getProfileImageUrl(selectedCreator)!}
                      alt={selectedCreator.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                      <span className="text-primary text-4xl">{selectedCreator.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
                  <p className="text-foreground flex flex-wrap items-center gap-1.5">
                    <span>{selectedCreator.name} {selectedCreator.lastName ?? ''}</span>
                    <CreatorBadge type={selectedCreator.type ?? ''} />
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">อีเมล</label>
                  <p className="text-foreground">
                    <a href={`mailto:${selectedCreator.email}`} className="text-primary hover:underline">
                      {selectedCreator.email || '-'}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
                  <p className="text-foreground flex items-center gap-2">
                    <FaPhone className="w-4 h-4 text-primary" />
                    <a href={`tel:${selectedCreator.phone}`} className="text-primary hover:underline">
                      {selectedCreator.phone || '-'}
                    </a>
                  </p>
                </div>
                {isAswHouseholdType(selectedCreator.type) && (
                  <div>
                    <label className="text-muted-foreground">โครงการ</label>
                    <p className="text-foreground">
                      {selectedCreator.projectName
                        ? projects.find((p) => p.id === selectedCreator.projectName)?.name || selectedCreator.projectName
                        : 'ไม่ระบุ'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-muted-foreground">หมวดหมู่</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.categories && selectedCreator.categories.length > 0
                      ? selectedCreator.categories.map((category) => (
                          <div
                            key={category}
                            className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 text-primary"
                          >
                            {category}
                          </div>
                        ))
                      : <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1">บัญชีโซเชียลมีเดีย</label>
                  {socialList(selectedCreator.socialAccounts, selectedCreator.followerCounts)}
                </div>
                <div>
                  <label className="text-muted-foreground">
                    ลิงก์ใน Mission นี้ ({creatorMissionLinks.length})
                  </label>
                  <div className="mt-2 rounded-lg border border-border">
                    {missionLinksLoading ? (
                      <div className="flex items-center gap-2 p-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        กำลังโหลดลิงก์...
                      </div>
                    ) : creatorMissionLinks.length === 0 ? (
                      <p className="p-4 text-muted-foreground">ยังไม่มีลิงก์ใน Mission นี้</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {creatorMissionLinks.map((link) => {
                          const projectName = link.projectId
                            ? projects.find((project) => project.id === link.projectId)?.name ?? 'ไม่ระบุโครงการ'
                            : 'ไม่ระบุโครงการ';
                          const clicks = missionLinkClicks[link.id]?.total;

                          return (
                            <li key={link.id} className="space-y-1.5 p-3">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-sm text-primary hover:underline"
                                title={link.url}
                              >
                                {link.url}
                              </a>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{projectName}</span>
                                <span className="inline-flex items-center gap-1">
                                  {missionLinkClicksLoading ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      กำลังโหลดคลิก...
                                    </>
                                  ) : (
                                    <>
                                      <MousePointerClick className="h-3 w-3" />
                                      {typeof clicks === 'number' ? clicks.toLocaleString() : 'N/A'} คลิก
                                    </>
                                  )}
                                </span>
                                <span>
                                  {new Date(link.createdAt).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              {link.postLinks && link.postLinks.length > 0 && (
                                <div className="space-y-1 border-t border-border/60 pt-2">
                                  <p className="text-xs font-medium text-foreground">ลิงก์โพสต์ที่ส่งมา</p>
                                  {link.postLinks.map((postLink, index) => (
                                    <a
                                      key={`${link.id}-post-${index}`}
                                      href={postLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-start gap-1.5 break-all text-xs text-primary hover:underline"
                                    >
                                      <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      {postLink}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">ไม่พบข้อมูลครีเอเตอร์</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
