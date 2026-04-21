'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import {
  AffiliateLink,
  CreatorProfile,
  type FgfLeadWithProjects,
} from '../../types';
import {
  getAffiliateLinksByCreator,
  getCreatorById,
  getCreators,
  getCurrentUser,
  getFgfLeadsWithProjects,
  getProjects,
  updateFgfLeadStatusAndChoice,
} from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import { getProfileImageUrl } from '../../utils/profileImage';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  ChevronLeft,
  ChevronRight,
  LinkIcon,
  Loader2,
  MailIcon,
  MousePointerClick,
  SendHorizontal,
  UserRound,
} from 'lucide-react';
import { FaPhone } from 'react-icons/fa6';
import { BASE_PATH } from '@/lib/publicPath';
import { formatGenericErrorToast } from '../../utils/toast-error';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../ui/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AdminDashboardCharts } from './AdminDashboardCharts';
import { AdminAffiliateReports } from './AdminAffiliateReports';
import type { AdminAffiliateReportsResponse } from '@/modules/types/adminAffiliateReports';
import type { ShlinkVisitStats } from '@/lib/shlink-server';

/** react-select only on client — avoids SSR/hydration drift and mount swap vs skeleton. */
function ReactSelectSkeleton() {
  return (
    <div
      className="min-h-[38px] w-full rounded-md border border-border bg-input-background"
      aria-hidden
    />
  );
}

const Select = dynamic(() => import('react-select').then((mod) => mod.default), {
  ssr: false,
  loading: () => <ReactSelectSkeleton />,
}) as typeof import('react-select').default;

function AssetwiseStaffBadge() {
  return (
    <span className="inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-blue-50 text-blue-700 border border-blue-200/80">
      ASSETWISE
    </span>
  );
}

function AssetwiseHouseholdBadge() {
  return (
    <span className="inline-flex items-center shrink-0 px-1.5 py-0.5 rounded-md font-normal text-xs leading-none bg-green-50 text-green-700 border border-green-200/80">
      ลูกบ้าน
    </span>
  );
}

const PROFILE_ANALYST_PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  twitter: 'Twitter',
  lemon8: 'Lemon8',
};

function profileAnalystPlatformLabel(key: string): string {
  const lower = key.toLowerCase();
  if (PROFILE_ANALYST_PLATFORM_LABELS[lower]) return PROFILE_ANALYST_PLATFORM_LABELS[lower];
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function ProfileAnalystAiSection({ creator }: { creator: CreatorProfile }) {
  const legacy = creator.profileAnalystLegacyText;
  const ai = creator.profileAnalyst;

  if (legacy) {
    return (
      <div className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="text-sm font-medium text-foreground">ผลวิเคราะห์ด้วย AI</h4>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{legacy}</p>
      </div>
    );
  }

  if (!ai) {
    return (
      <div>
        <h4 className="text-sm font-medium text-foreground mb-1">ผลวิเคราะห์ด้วย AI</h4>
        <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  const platformEntries = Object.entries(ai.platform_scores);

  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="font-medium text-foreground mb-0">ผลวิเคราะห์ด้วย AI</h4>
      <div className="mb-4">
        <label className="text-muted-foreground mb-2">คะแนนรวม</label>
        <p className="text-foreground text-2xl font-medium mt-0.5">
          {ai.overall_quality_score} / 10
        </p>
      </div>

      {ai.categories.length > 0 && (
        <div className="mb-4">
          <label className="text-muted-foreground mb-2">หมวดหมู่ที่วิเคราะห์</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ai.categories.map((c) => (
              <span
                key={c}
                className="inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-foreground border border-primary/20"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {platformEntries.length > 0 && (
        <div>
          <label className="text-muted-foreground block mb-1">คะแนนรายแพลตฟอร์ม</label>
          <Accordion type="single" collapsible className="rounded-md border border-border">
            {platformEntries.map(([key, val]) => (
              <AccordionItem key={key} value={key} className="border-b-0">
                <AccordionTrigger className="hover:no-underline px-3 py-2 text-sm">
                  <span className="font-medium text-left">
                    {profileAnalystPlatformLabel(key)} — {val.score}/10
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{val.summary}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {ai.reasoning.trim() !== '' && (
        <div>
          <label className="text-muted-foreground text-xs">เหตุผลการวิเคราะห์</label>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{ai.reasoning}</p>
        </div>
      )}

      {ai.content_style.trim() !== '' && (
        <div>
          <label className="text-muted-foreground text-xs">สไตล์คอนเทนต์</label>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{ai.content_style}</p>
        </div>
      )}

      {ai.audience_fit.trim() !== '' && (
        <div>
          <label className="text-muted-foreground text-xs">ความเหมาะสมกับกลุ่มเป้าหมาย</label>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{ai.audience_fit}</p>
        </div>
      )}

      {ai.recommendation.trim() !== '' && (
        <div>
          <label className="text-muted-foreground text-xs">ข้อเสนอแนะ</label>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{ai.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<CreatorProfile[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'inactive'>('pending');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [categoryLabels, setCategoryLabels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const CREATORS_PAGE_SIZE = 15;
  const [creatorPage, setCreatorPage] = useState(1);
  const [followerRange, setFollowerRange] = useState('all');
  const [customFollowers, setCustomFollowers] = useState('');
  const [loading, setLoading] = useState(true);
  const [affiliateReport, setAffiliateReport] = useState<AdminAffiliateReportsResponse | null>(null);
  const [affiliateReportLoading, setAffiliateReportLoading] = useState(true);
  const [affiliateReportError, setAffiliateReportError] = useState<string | null>(null);
  const [creatorAffiliateLinks, setCreatorAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [affiliateLinksLoading, setAffiliateLinksLoading] = useState(false);
  const [affiliateLinkClicks, setAffiliateLinkClicks] = useState<Record<string, ShlinkVisitStats | null>>({});
  const [affiliateLinkClicksLoading, setAffiliateLinkClicksLoading] = useState(false);
  const [affiliateLinkClicksEnabled, setAffiliateLinkClicksEnabled] = useState(true);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    creator: CreatorProfile | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, creator: null, action: null });
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  /** `${creatorId}:approval` | `${creatorId}:rejection` while that request is in flight */
  const [emailSendKey, setEmailSendKey] = useState<string | null>(null);

  const [fgfLeads, setFgfLeads] = useState<FgfLeadWithProjects[]>([]);
  const [fgfLoading, setFgfLoading] = useState(false);
  const [fgfSearch, setFgfSearch] = useState('');
  const [fgfCisFilter, setFgfCisFilter] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [selectedFgf, setSelectedFgf] = useState<FgfLeadWithProjects | null>(null);
  const [fgfNestedCreator, setFgfNestedCreator] = useState<CreatorProfile | null>(null);
  const [fgfNestedCreatorLoading, setFgfNestedCreatorLoading] = useState(false);
  const [fgfCisSubmitting, setFgfCisSubmitting] = useState(false);
  const [projectNameById, setProjectNameById] = useState<Record<string, string>>({});

  const categoryOptions = useMemo(
    () => ['ทั้งหมด', ...categoryLabels].map((cat) => ({ value: cat, label: cat })),
    [categoryLabels],
  );

  const fgfCisOptions: Array<{ value: typeof fgfCisFilter; label: string }> = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'pending', label: 'ยังไม่ส่ง CIS' },
    { value: 'uploaded', label: 'ส่ง CIS แล้ว' },
  ];

  const filteredFgfLeads = useMemo(() => {
    let rows = fgfLeads;
    if (fgfCisFilter === 'uploaded') {
      rows = rows.filter((row) => row.lead.uploadedToCrm);
    } else if (fgfCisFilter === 'pending') {
      rows = rows.filter((row) => !row.lead.uploadedToCrm);
    }
    const q = fgfSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(({ lead }) => {
        const pool = [
          lead.leadName,
          lead.leadLastName,
          lead.leadEmail,
          lead.leadTel,
          lead.referrerName,
          lead.referrerLastName,
          lead.referrerEmail,
          lead.referrerTel,
          lead.refUid ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return pool.includes(q);
      });
    }
    return rows;
  }, [fgfLeads, fgfCisFilter, fgfSearch]);

  const followerOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: '0-1k', label: '0 - 1,000' },
    { value: '1k-10k', label: '1,000 - 10,000' },
    { value: '10k-50k', label: '10,000 - 50,000' },
    { value: '50k-100k', label: '50,000 - 100,000' },
    { value: '100k-500k', label: '100,000 - 500,000' },
    { value: '500k+', label: '500,000+' },
    { value: 'custom', label: 'กำหนดเอง' },
  ];

  useEffect(() => {
    loadCreators();
  }, []);

  useEffect(() => {
    const loadCategoryOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('creator_categories')
          .select('th_label,en_label')
          .eq('is_active', true)
          .order('id', { ascending: true });
        if (error) throw error;

        const labels = (data || [])
          .map((row) => (row.th_label || row.en_label || '').trim())
          .filter(Boolean);
        setCategoryLabels(labels);
      } catch (error) {
        console.error('Error loading admin category options:', error);
        setCategoryLabels([]);
      }
    };

    void loadCategoryOptions();
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      setAffiliateReportLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setAffiliateReportLoading(true);
        setAffiliateReportError(null);
        const res = await fetch(`${BASE_PATH}/api/admin/affiliate-reports`, { credentials: 'same-origin' });
        const json = (await res.json().catch(() => ({}))) as Partial<AdminAffiliateReportsResponse> & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setAffiliateReport(null);
          setAffiliateReportError(json.error ?? 'ไม่สามารถโหลดรายงาน Affiliate ได้');
          return;
        }
        setAffiliateReport({
          topCreators: json.topCreators ?? [],
          topProjects: json.topProjects ?? [],
          shlinkConfigured: Boolean(json.shlinkConfigured),
        });
      } catch {
        if (!cancelled) {
          setAffiliateReport(null);
          setAffiliateReportError('ไม่สามารถโหลดรายงาน Affiliate ได้');
        }
      } finally {
        if (!cancelled) setAffiliateReportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFgfLoading(true);
        const [leads, projects] = await Promise.all([getFgfLeadsWithProjects(), getProjects()]);
        if (cancelled) return;
        setFgfLeads(leads);
        setProjectNameById(Object.fromEntries(projects.map((p) => [p.id, p.name])));
      } catch (error) {
        console.error('Error loading FGF leads:', error);
        if (!cancelled) toast.error('ไม่สามารถโหลดลีด Friend Get Friends ได้');
      } finally {
        if (!cancelled) setFgfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCreatorPage(1);
    filterCreators();
  }, [creators, selectedCategory, searchQuery, followerRange, customFollowers, approvalFilter]);

  const creatorsBaseFiltered = useMemo(() => {
    let filtered = [...creators];

    // Hide internal/test accounts from admin creator listing
    filtered = filtered.filter((creator) => !creator.email.toLowerCase().includes('@creatorclub.com'));

    if (selectedCategory !== 'ทั้งหมด') {
      filtered = filtered.filter((creator) => creator.categories && creator.categories.includes(selectedCategory));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (creator) =>
          creator.name.toLowerCase().includes(q) || creator.email.toLowerCase().includes(q),
      );
    }

    if (followerRange === 'custom' && customFollowers) {
      const min = parseInt(customFollowers);
      filtered = filtered.filter((creator) => creator.followers >= min);
    } else if (followerRange !== 'all') {
      const ranges: { [key: string]: { min: number; max?: number } } = {
        '0-1k': { min: 0, max: 1000 },
        '1k-10k': { min: 1000, max: 10000 },
        '10k-50k': { min: 10000, max: 50000 },
        '50k-100k': { min: 50000, max: 100000 },
        '100k-500k': { min: 100000, max: 500000 },
        '500k+': { min: 500000 },
      };

      const range = ranges[followerRange];
      if (range) {
        filtered = filtered.filter((creator) => {
          const followers = creator.followers;
          if (range.max) return followers >= range.min && followers < range.max;
          return followers >= range.min;
        });
      }
    }

    return filtered;
  }, [creators, customFollowers, followerRange, searchQuery, selectedCategory]);

  const creatorStatusCounts = useMemo(() => {
    const rows = creatorsBaseFiltered;
    const pending = rows.filter((c) => c.approvalStatus === 3).length;
    const approved = rows.filter((c) => c.approvalStatus === 1).length;
    const rejected = rows.filter((c) => c.approvalStatus === 0).length;
    const inactive = rows.filter((c) => c.approvalStatus === 2).length;
    const all = rows.length;
    return { all, pending, approved, rejected, inactive };
  }, [creatorsBaseFiltered]);

  const affiliateDrawerCreator = selectedCreator ?? fgfNestedCreator;

  useEffect(() => {
    const loadCreatorAffiliateLinks = async () => {
      if (!affiliateDrawerCreator) {
        setCreatorAffiliateLinks([]);
        setAffiliateLinkClicks({});
        setAffiliateLinkClicksEnabled(true);
        return;
      }

      try {
        setAffiliateLinksLoading(true);
        setAffiliateLinkClicksLoading(true);
        const [links, clickStatsRes] = await Promise.all([
          getAffiliateLinksByCreator(affiliateDrawerCreator.id),
          fetch(`${BASE_PATH}/api/admin/creators/${affiliateDrawerCreator.id}/affiliate-clicks`, {
            credentials: 'same-origin',
          }),
        ]);
        setCreatorAffiliateLinks(links);

        const clickStatsJson = (await clickStatsRes.json().catch(() => ({}))) as {
          stats?: Record<string, ShlinkVisitStats | null>;
          shlinkConfigured?: boolean;
        };
        if (clickStatsRes.ok) {
          setAffiliateLinkClicks(clickStatsJson.stats ?? {});
          setAffiliateLinkClicksEnabled(Boolean(clickStatsJson.shlinkConfigured));
        } else {
          setAffiliateLinkClicks({});
          setAffiliateLinkClicksEnabled(true);
        }
      } catch (error) {
        console.error('Error loading affiliate links by creator:', error);
        toast.error('ไม่สามารถโหลดลิงก์ Affiliate ของครีเอเตอร์ได้');
        setAffiliateLinkClicks({});
        setAffiliateLinkClicksEnabled(true);
      } finally {
        setAffiliateLinksLoading(false);
        setAffiliateLinkClicksLoading(false);
      }
    };

    void loadCreatorAffiliateLinks();
  }, [affiliateDrawerCreator]);

  const loadCreators = async () => {
    try {
      setLoading(true);
      const allCreators = await getCreators();
      setCreators(allCreators.filter((creator) => !creator.isAdmin && !creator.isMkt));
    } catch (error) {
      console.error('Error loading Creators:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filterCreators = () => {
    let filtered = [...creatorsBaseFiltered];

    // Approval status filter
    if (approvalFilter === 'pending') {
      filtered = filtered.filter((creator) => creator.approvalStatus === 3);
    } else if (approvalFilter === 'approved') {
      filtered = filtered.filter((creator) => creator.approvalStatus === 1);
    } else if (approvalFilter === 'rejected') {
      filtered = filtered.filter((creator) => creator.approvalStatus === 0);
    } else if (approvalFilter === 'inactive') {
      filtered = filtered.filter((creator) => creator.approvalStatus === 2);
    }

    setFilteredCreators(filtered);
  };

  const safeCreatorPage = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCreators.length / CREATORS_PAGE_SIZE));
    return Math.min(Math.max(creatorPage, 1), totalPages);
  }, [CREATORS_PAGE_SIZE, creatorPage, filteredCreators.length]);

  const pagedCreators = useMemo(() => {
    const startIndex = (safeCreatorPage - 1) * CREATORS_PAGE_SIZE;
    return filteredCreators.slice(startIndex, startIndex + CREATORS_PAGE_SIZE);
  }, [CREATORS_PAGE_SIZE, filteredCreators, safeCreatorPage]);

  const creatorTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCreators.length / CREATORS_PAGE_SIZE));
  }, [CREATORS_PAGE_SIZE, filteredCreators.length]);

  const creatorStartIndex = (safeCreatorPage - 1) * CREATORS_PAGE_SIZE;
  const creatorFrom = filteredCreators.length === 0 ? 0 : creatorStartIndex + 1;
  const creatorTo = Math.min(creatorStartIndex + CREATORS_PAGE_SIZE, filteredCreators.length);

  const approvalStatusBadge = (creator: CreatorProfile) => {
    const status = creator.approvalStatus;
    if (status === 1) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">อนุมัติแล้ว</span>;
    }
    if (status === 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">ถูกปฏิเสธ</span>;
    }
    if (status === 2) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">ไม่ใช้งาน</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">รอการอนุมัติ</span>;
  };

  const openReferrerCreatorFromFgf = async (referrerCreatorId: string) => {
    try {
      setFgfNestedCreatorLoading(true);
      const profile = await getCreatorById(referrerCreatorId);
      if (!profile) {
        toast.error('ไม่พบโปรไฟล์ครีเอเตอร์');
        return;
      }
      setFgfNestedCreator(profile);
    } catch (e) {
      console.error('openReferrerCreatorFromFgf', e);
      toast.error('ไม่สามารถโหลดโปรไฟล์ครีเอเตอร์ได้');
    } finally {
      setFgfNestedCreatorLoading(false);
    }
  };

  const openCreatorDetailFromReport = async (creatorId: string) => {
    try {
      setSelectedFgf(null);
      setFgfNestedCreator(null);
      const profile = await getCreatorById(creatorId);
      if (!profile) {
        toast.error('ไม่พบข้อมูลครีเอเตอร์');
        return;
      }
      setSelectedCreator(profile);
    } catch (error) {
      console.error('openCreatorDetailFromReport', error);
      toast.error('ไม่สามารถโหลดข้อมูลครีเอเตอร์ได้');
    }
  };

  const buildFgfCisPayload = (row: FgfLeadWithProjects) => {
    const { lead, projectIds } = row;
    return {
      fgfLeadId: lead.id,
      source: 'creatorclub_friend_get_friends',
      referred: {
        firstName: lead.leadName,
        lastName: lead.leadLastName,
        email: lead.leadEmail,
        telephone: lead.leadTel,
      },
      referrer: {
        firstName: lead.referrerName,
        lastName: lead.referrerLastName,
        email: lead.referrerEmail,
        telephone: lead.referrerTel,
        creatorId: lead.referrerCreatorId ?? null,
        refUid: lead.refUid ?? null,
      },
      projectIds,
      projectNames: projectIds.map((id) => projectNameById[id] || id),
      chosenProjectId: lead.chosenProjectId ?? null,
      createdAt: lead.createdAt,
    };
  };

  const handleSendFgfLeadToCis = async () => {
    if (!selectedFgf) return;
    if (selectedFgf.lead.uploadedToCrm) {
      toast.info('ลีดนี้ส่งเข้า CIS แล้ว');
      return;
    }
    try {
      setFgfCisSubmitting(true);
      const payload = buildFgfCisPayload(selectedFgf);
      const res = await fetch(`${BASE_PATH}/api/admin/fgf-leads/${selectedFgf.lead.id}/cis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        cis?: unknown;
        error?: string;
      };
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'ส่งข้อมูลเข้า CIS ไม่สำเร็จ');
        return;
      }
      const uploadedAt = new Date().toISOString();
      const admin = getCurrentUser();
      await updateFgfLeadStatusAndChoice(selectedFgf.lead.id, {
        status: 'uploaded',
        uploadedToCrm: true,
        uploadedAt,
        uploadedBy: admin?.id ?? null,
        crmResponse: data.cis ?? null,
      });
      const nextLead = {
        ...selectedFgf.lead,
        uploadedToCrm: true,
        status: 'uploaded' as const,
        uploadedAt,
        uploadedBy: admin?.id,
        crmResponse: data.cis ?? null,
        updatedAt: uploadedAt,
      };
      const leadId = selectedFgf.lead.id;
      setFgfLeads((prev) => prev.map((r) => (r.lead.id === leadId ? { ...r, lead: nextLead } : r)));
      setSelectedFgf((prev) => (prev && prev.lead.id === leadId ? { ...prev, lead: nextLead } : prev));
      toast.success('ส่งข้อมูลเข้า CIS สำเร็จ');
    } catch (e) {
      console.error('handleSendFgfLeadToCis', e);
      toast.error(formatGenericErrorToast('เกิดข้อผิดพลาด กรุณาลองใหม่', e));
    } finally {
      setFgfCisSubmitting(false);
    }
  };

  const updateApprovalStatus = async (creator: CreatorProfile, status: 0 | 1 | 2 | 3): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: status })
        .eq('id', creator.id);

      if (error) {
        console.error('Update approval status error:', error);
        toast.error('ไม่สามารถอัปเดตสถานะได้');
        return false;
      }

      toast.success('อัปเดตสถานะสำเร็จ');
      // Refresh list locally
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, approvalStatus: status } : c)),
      );
      setSelectedCreator((prev) =>
        prev && prev.id === creator.id ? { ...prev, approvalStatus: status } : prev,
      );
      setFgfNestedCreator((prev) =>
        prev && prev.id === creator.id ? { ...prev, approvalStatus: status } : prev,
      );
      return true;
    } catch (error) {
      console.error('Update approval status error:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้');
      return false;
    }
  };

  const openDecisionDialog = (creator: CreatorProfile, action: 'approve' | 'reject') => {
    setDecisionDialog({ open: true, creator, action });
  };

  const handleDecisionConfirm = async (sendEmail: boolean) => {
    const creator = decisionDialog.creator;
    const action = decisionDialog.action;
    if (!creator || !action) return;

    try {
      setDecisionSubmitting(true);
      const nextStatus: 0 | 1 = action === 'approve' ? 1 : 0;
      const updated = await updateApprovalStatus(creator, nextStatus);
      if (!updated) return;

      if (sendEmail) {
        if (action === 'approve') {
          await sendApprovalEmail(creator);
        } else {
          await sendRejectionEmail(creator);
        }
      }

      setDecisionDialog({ open: false, creator: null, action: null });
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const sendApprovalEmail = async (creator: CreatorProfile) => {
    const key = `${creator.id}:approval`;
    try {
      setEmailSendKey(key);
      const res = await fetch(`${BASE_PATH}/api/admin/creators/${creator.id}/email/approval`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; dev?: boolean; error?: string };

      if (!res.ok) {
        toast.error('ไม่สามารถส่งอีเมลได้');
        return;
      }

      if (data.dev) {
        toast.success('โหมดพัฒนา: ยังไม่ได้ตั้งค่า SMTP — อีเมลไม่ถูกส่งจริง');
        return;
      }

      toast.success('ส่งอีเมลแจ้งอนุมัติแล้ว');
    } catch (error) {
      console.error('sendApprovalEmail', error);
      toast.error('ไม่สามารถส่งอีเมลได้');
    } finally {
      setEmailSendKey(null);
    }
  };

  const sendRejectionEmail = async (creator: CreatorProfile) => {
    const key = `${creator.id}:rejection`;
    try {
      setEmailSendKey(key);
      const res = await fetch(`${BASE_PATH}/api/admin/creators/${creator.id}/email/rejection`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; dev?: boolean; error?: string };

      if (!res.ok) {
        toast.error('ไม่สามารถส่งอีเมลได้');
        return;
      }

      if (data.dev) {
        toast.success('โหมดพัฒนา: ยังไม่ได้ตั้งค่า SMTP — อีเมลไม่ถูกส่งจริง');
        return;
      }

      toast.success('ส่งอีเมลแจ้งผลการพิจารณาแล้ว');
    } catch (error) {
      console.error('sendRejectionEmail', error);
      toast.error('ไม่สามารถส่งอีเมลได้');
    } finally {
      setEmailSendKey(null);
    }
  };

  const getSocialLinks = (creator: CreatorProfile) => {
    const links = [];
    if (creator.socialAccounts.facebook) links.push({ name: 'Facebook', url: creator.socialAccounts.facebook });
    if (creator.socialAccounts.instagram) links.push({ name: 'Instagram', url: creator.socialAccounts.instagram });
    if (creator.socialAccounts.tiktok) links.push({ name: 'TikTok', url: creator.socialAccounts.tiktok });
    if (creator.socialAccounts.youtube) links.push({ name: 'YouTube', url: creator.socialAccounts.youtube });
    if (creator.socialAccounts.twitter) links.push({ name: 'Twitter', url: creator.socialAccounts.twitter });
    if (creator.socialAccounts.lemon8) links.push({ name: 'Lemon8', url: creator.socialAccounts.lemon8 });
    return links;
  };

  const formatFgfProjectCell = (projectIds: string[]) => {
    if (projectIds.length === 0) return '—';
    const names = projectIds.map((id) => projectNameById[id] || id.slice(0, 8));
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names[0]} +${names.length - 1}`;
  };

  const renderCreatorProfileFields = (creator: CreatorProfile) => (
    <>
      <div className="flex justify-center mb-2">
        {getProfileImageUrl(creator) ? (
          <ImageWithFallback
            src={getProfileImageUrl(creator)!}
            alt={creator.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <span className="text-primary text-5xl">{creator.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      <div>
        <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
        <p className="text-foreground flex flex-wrap items-center gap-1.5">
          <span>
            {creator.name} {creator.lastName}
          </span>
          {creator.type === 'assetwise_staff' && <AssetwiseStaffBadge />}
        </p>
      </div>

      <div>
        <label className="text-muted-foreground">อีเมล</label>
        <p className="text-foreground flex items-center gap-2">
          <MailIcon className="w-4 h-4 text-primary" /> 
          <a href={`mailto:${creator.email}`} className="text-primary hover:underline">{creator.email}</a>
        </p>
      </div>

      <div>
        <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
        <p className="text-foreground flex items-center gap-2">
          <FaPhone className="w-4 h-4 text-primary" /> 
          <a href={`tel:${creator.phone}`} className="text-primary hover:underline">{creator.phone}</a>
        </p>
      </div>

      <div>
        <label className="text-muted-foreground">หมวดหมู่</label>
        <div className="flex gap-2">
          {creator.categories && creator.categories.length > 0 ? creator.categories.map((category) => (
            <div key={category} className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 text-primary">
              {category}
            </div>
          )) : <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>}
        </div> 
      </div>

      <div>
        <label className="text-muted-foreground">บัญชีโซเชียลมีเดีย</label>
        <div className="flex flex-col gap-2">
          {getSocialLinks(creator).map((social, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-medium text-foreground w-24">{
              social.name + ': '}</span>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {social.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
          ))}
          {getSocialLinks(creator).length === 0 && <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>}
        </div>
      </div>

      <ProfileAnalystAiSection creator={creator} />

      {creator.approvalStatus === 3 && (
        <>
          <h4 className="text-muted-foreground mb-2">การพิจารณา</h4>
          <div className="w-full flex flex-col md:flex-row gap-2">
            <Button onClick={() => openDecisionDialog(creator, 'approve')} variant="success" fullWidth>
              อนุมัติ
            </Button>
            <Button onClick={() => openDecisionDialog(creator, 'reject')} variant="error" fullWidth>
              ปฏิเสธ
            </Button>
          </div>
        </>
      )}

      <div>
        <label className="text-muted-foreground">Affiliate Links</label>
        <div className="mt-2 rounded-lg border border-border">
          {affiliateLinksLoading ? (
            <div className="py-4 text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดลิงก์ Affiliate...</span>
            </div>
          ) : creatorAffiliateLinks.length === 0 ? (
            <div className="p-4 text-muted-foreground">ยังไม่มีลิงก์ Affiliate</div>
          ) : (
            <Accordion type="single" collapsible>
              {creatorAffiliateLinks.map((link) => (
                <AccordionItem key={link.id} value={link.id}>
                  <AccordionTrigger className="hover:no-underline px-4">
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex flex-col text-left">
                        <span className="font-medium text-foreground">{link.campaignName}</span>
                        <span className="text-muted-foreground">
                          {new Date(link.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {affiliateLinkClicksLoading ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            กำลังโหลดคลิก...
                          </>
                        ) : !affiliateLinkClicksEnabled ? (
                          'Shlink ไม่พร้อมใช้งาน'
                        ) : (
                          <>
                            <MousePointerClick className="h-3.5 w-3.5" />
                            {(affiliateLinkClicks[link.id]?.total ?? 0).toLocaleString()} คลิก
                          </>
                        )}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <div className="space-y-2">
                      {!link.postLinks || link.postLinks.length === 0 ? (
                        <p className="text-muted-foreground">ยังไม่มีลิงก์โพสต์ที่ครีเอเตอร์ส่งมา</p>
                      ) : (
                        link.postLinks.map((postLink, index) => (
                          <a
                            key={`${link.id}-post-${index}`}
                            href={postLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all flex items-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" /> {postLink}
                          </a>
                        ))
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      <div>
        <label className="text-muted-foreground">วันที่ลงทะเบียน</label>
        <p className="text-foreground">
          {new Date(creator.createdAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </>
  );

  return (
    <div className="container mx-auto p-6">
      <h2 className="mb-4">แดชบอร์ดผู้ดูแลระบบ</h2>

      <Tabs defaultValue="overview" className="w-full gap-4">
        <TabsList className="w-full max-w-md grid grid-cols-2 h-auto p-1">
          <TabsTrigger value="overview" className="py-2">
            ภาพรวม
          </TabsTrigger>
          <TabsTrigger value="creators" className="py-2">
            จัดการครีเอเตอร์
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
          <div>
            <AdminDashboardCharts creators={creators} loading={loading} />
          </div>
          <AdminAffiliateReports
            data={affiliateReport}
            loading={affiliateReportLoading}
            error={affiliateReportError}
            onSelectCreator={openCreatorDetailFromReport}
          />
        </TabsContent>

        <TabsContent value="creators" className="mt-4 flex flex-col gap-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6">
          <h3 className="text-neutral-700 text-xl font-medium mb-2">ค้นหาและกรองข้อมูล</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label>ค้นหา (ชื่อ / อีเมล)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา..."
                className="px-4 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label>หมวดหมู่</label>
              <Select
                options={categoryOptions}
                value={categoryOptions.find((o) => o.value === selectedCategory)}
                onChange={(option) => {
                  setSelectedCategory(option?.value ?? 'ทั้งหมด');
                }}
                isClearable={false}
                classNamePrefix="react-select"
                placeholder="ทั้งหมด"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label>ผู้ติดตาม (follower)</label>
              <Select
                options={followerOptions}
                value={followerOptions.find((o) => o.value === followerRange)}
                onChange={(option) => {
                  const value = option?.value ?? 'all';
                  setFollowerRange(value);
                  if (value !== 'custom') {
                    setCustomFollowers('');
                  }
                }}
                isClearable={false}
                classNamePrefix="react-select"
                placeholder="ทั้งหมด"
              />
            </div>
          </div>

          {/* Custom Followers Input */}
          {followerRange === 'custom' && (
            <div className="mt-4">
              <div className="flex flex-col gap-1.5 max-w-xs">
                <label>จำนวนผู้ติดตามขั้นต่ำ</label>
                <input
                  type="number"
                  value={customFollowers}
                  onChange={(e) => setCustomFollowers(e.target.value)}
                  placeholder="กรอกจำนวนผู้ติดตาม..."
                  className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6">
          <div className="flex flex-col gap-1 mb-4">
            <h3 className="text-primary text-2xl font-medium mb-2">ครีเอเตอร์ทั้งหมด ({filteredCreators.length})</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setApprovalFilter('all')}
                className={cn(
                  'hover:text-foreground transition-colors cursor-pointer',
                  approvalFilter === 'all' && 'text-foreground font-medium',
                )}
              >
                ทั้งหมด <span className="text-muted-foreground">({creatorStatusCounts.all})</span>
              </button>
              <span className="text-muted-foreground/60">|</span>
              <button
                type="button"
                onClick={() => setApprovalFilter('pending')}
                className={cn(
                  'hover:text-foreground transition-colors cursor-pointer',
                  approvalFilter === 'pending' && 'text-foreground font-medium',
                )}
              >
                รออนุมัติ <span className="text-muted-foreground">({creatorStatusCounts.pending})</span>
              </button>
              <span className="text-muted-foreground/60">|</span>
              <button
                type="button"
                onClick={() => setApprovalFilter('approved')}
                className={cn(
                  'hover:text-foreground transition-colors cursor-pointer',
                  approvalFilter === 'approved' && 'text-foreground font-medium',
                )}
              >
                อนุมัติแล้ว <span className="text-muted-foreground">({creatorStatusCounts.approved})</span>
              </button>
              <span className="text-muted-foreground/60">|</span>
              <button
                type="button"
                onClick={() => setApprovalFilter('rejected')}
                className={cn(
                  'hover:text-foreground transition-colors cursor-pointer',
                  approvalFilter === 'rejected' && 'text-foreground font-medium',
                )}
              >
                ถูกปฏิเสธ <span className="text-muted-foreground">({creatorStatusCounts.rejected})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8 flex items-center gap-2 justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
              กำลังโหลดข้อมูล
            </p>
          ) : filteredCreators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">ไม่พบข้อมูล Creator</p>
          ) : (
            <>
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ชื่อ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">อีเมล</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โทรศัพท์</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โซเชียล</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">สถานะ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCreators.map((creator) => (
                      <tr
                        key={creator.id}
                        className="border-b border-border hover:bg-input-background/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-foreground">{creator.name} {creator.lastName} {creator.type === 'assetwise_staff' && <AssetwiseStaffBadge />} {creator.type === 'asw_houshold' && <AssetwiseHouseholdBadge />}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{creator.email}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{creator.phone || '-'}</td>
                        <td className="py-3 px-4 text-sm text-foreground">{getSocialLinks(creator).length} ช่องทาง</td>
                        <td className="py-3 px-4">{approvalStatusBadge(creator)}</td>
                        <td className="py-3 px-4">
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedFgf(null);
                              setFgfNestedCreator(null);
                              setSelectedCreator(creator);
                            }}
                            variant="ghost"
                            className="cursor-pointer rounded-full p-2"
                            aria-label={`ดูรายละเอียด ${creator.name}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCreators.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
                  <div>
                    แสดง {creatorFrom}–{creatorTo} จาก {filteredCreators.length} รายการ
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCreatorPage((p) => Math.max(p - 1, 1))}
                      disabled={safeCreatorPage === 1}
                      className="px-3 py-1 text-sm flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      ก่อนหน้า
                    </Button>
                    <span>
                      หน้า {safeCreatorPage} จาก {creatorTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCreatorPage((p) => Math.min(p + 1, creatorTotalPages))}
                      disabled={safeCreatorPage >= creatorTotalPages}
                      className="px-3 py-1 text-sm flex items-center gap-2"
                    >
                      ถัดไป
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </TabsContent>
      </Tabs>

      <Drawer
        direction="right"
        open={!!selectedCreator}
        onOpenChange={(open) => {
          if (!open) setSelectedCreator(null);
        }}
      >
        <DrawerContent className="overflow-y-auto overflow-x-hidden select-text">
          {selectedCreator && (
            <>
              <DrawerHeader className="p-7">
                <DrawerTitle>รายละเอียด Creator</DrawerTitle>
                <DrawerDescription>ข้อมูลครีเอเตอร์สำหรับตรวจสอบและติดต่อ</DrawerDescription>
              </DrawerHeader>

              <div className="px-7 pb-7 space-y-4">{renderCreatorProfileFields(selectedCreator)}</div>

              <DrawerFooter>
                <div className="w-full flex flex-col gap-2">
                  <div className="w-full flex flex-col md:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => window.location.href = `tel:${selectedCreator.phone}`}
                    variant="outline"
                    center
                  >
                    <FaPhone className="w-5 h-5" />
                    ติดต่อ
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline">ปิด</Button>
                  </DrawerClose>
                  </div>
                </div>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Single FGF drawer: referrer profile swaps content in the same panel; back returns to lead detail. */}
      <Drawer
        direction="right"
        open={!!selectedFgf}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFgf(null);
            setFgfNestedCreator(null);
          }
        }}
      >
        <DrawerContent className="overflow-y-auto">
          {selectedFgf &&
            (fgfNestedCreator ? (
              <>
                <DrawerHeader className="p-7 pb-4 space-y-3 text-left">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 w-fit gap-1 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setFgfNestedCreator(null)}
                  >
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    กลับไปรายละเอียดลีด
                  </Button>
                  <DrawerTitle>โปรไฟล์ผู้แนะนำ (Creator)</DrawerTitle>
                  <DrawerDescription>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center flex-wrap gap-1.5">
                        {fgfNestedCreator.name}
                        {fgfNestedCreator.type === 'assetwise_staff' && <AssetwiseStaffBadge />}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{fgfNestedCreator.email}</span>
                    </span>
                  </DrawerDescription>
                </DrawerHeader>

                <div className="px-7 pb-7 space-y-4">{renderCreatorProfileFields(fgfNestedCreator)}</div>

                <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    center
                    className="w-full gap-2 sm:w-auto"
                    onClick={() => {
                      window.location.href = `tel:${fgfNestedCreator.phone}`;
                    }}
                  >
                    <FaPhone className="h-5 w-5 shrink-0" />
                    ติดต่อ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setFgfNestedCreator(null)}
                  >
                    กลับไปลีด
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      ปิดแผง
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </>
            ) : (
              <>
                <DrawerHeader className="p-7 pb-4">
                  <DrawerTitle>Friend Get Friends | Lead Detail</DrawerTitle>
                </DrawerHeader>

                <div className="px-7 pb-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedFgf.lead.uploadedToCrm ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        ส่ง CIS แล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        ยังไม่ส่ง CIS
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-muted-foreground text-sm">ผู้ถูกแนะนำ</label>
                    <p className="text-foreground font-medium">
                      {[selectedFgf.lead.leadName, selectedFgf.lead.leadLastName].filter(Boolean).join(' ') || '—'}
                    </p>
                    <p className="text-sm text-foreground">{selectedFgf.lead.leadEmail}</p>
                    <p className="text-sm text-muted-foreground">{selectedFgf.lead.leadTel || '—'}</p>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-sm">ผู้แนะนำ</label>
                    <p className="text-foreground font-medium">
                      {[selectedFgf.lead.referrerName, selectedFgf.lead.referrerLastName].filter(Boolean).join(' ') ||
                        '—'}
                    </p>
                    <p className="text-sm text-foreground">{selectedFgf.lead.referrerEmail}</p>
                    <p className="text-sm text-muted-foreground">{selectedFgf.lead.referrerTel || '—'}</p>
                    {selectedFgf.lead.referrerCreatorId ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 gap-2"
                        center
                        disabled={fgfNestedCreatorLoading}
                        onClick={() => void openReferrerCreatorFromFgf(selectedFgf.lead.referrerCreatorId!)}
                      >
                        {fgfNestedCreatorLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserRound className="w-4 h-4" />
                        )}
                        ดูโปรไฟล์ครีเอเตอร์
                      </Button>
                    ) : (
                      <p className="text-muted-foreground text-sm mt-2">
                        ไม่มีบัญชีครีเอเตอร์ผูกกับผู้แนะนำ (ลีดจากผู้ไม่ล็อกอิน)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-muted-foreground text-sm">โครงการที่สนใจ</label>
                    {selectedFgf.projectIds.length === 0 ? (
                      <p className="text-muted-foreground text-sm">—</p>
                    ) : (
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                        {selectedFgf.projectIds.map((id) => (
                          <li key={id}>{projectNameById[id] || id}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {selectedFgf.lead.chosenProjectId ? (
                    <div>
                      <label className="text-muted-foreground text-sm">โครงการที่เลือก (chosen)</label>
                      <p className="text-foreground text-sm">
                        {projectNameById[selectedFgf.lead.chosenProjectId] || selectedFgf.lead.chosenProjectId}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <label className="text-muted-foreground text-sm">สร้างเมื่อ</label>
                    <p className="text-foreground text-sm">
                      {new Date(selectedFgf.lead.createdAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-sm">อัปเดตล่าสุด</label>
                    <p className="text-foreground text-sm">
                      {new Date(selectedFgf.lead.updatedAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    type="button"
                    center
                    variant="primary"
                    className="w-full gap-2 sm:w-auto"
                    disabled={fgfCisSubmitting || selectedFgf.lead.uploadedToCrm}
                    onClick={() => void handleSendFgfLeadToCis()}
                  >
                    {fgfCisSubmitting ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <SendHorizontal className="h-4 w-4 shrink-0" />
                    )}
                    ส่งข้อมูลเข้า CIS
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      ปิด
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </>
            ))}
        </DrawerContent>
      </Drawer>

      <Dialog
        open={decisionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionDialog({ open: false, creator: null, action: null });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog.action === 'approve' ? 'Approve ครีเอเตอร์' : 'Reject ครีเอเตอร์'}
            </DialogTitle>
            <DialogDescription>
              {decisionDialog.action === 'approve'
                ? `ต้องการ Approve ${decisionDialog.creator?.name ?? 'ครีเอเตอร์นี้'} หรือไม่`
                : `ต้องการ Reject ${decisionDialog.creator?.name ?? 'ครีเอเตอร์นี้'} หรือไม่`}
            </DialogDescription>
          </DialogHeader>
          <div className="h-7"></div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="errorTransparent"
              onClick={() => setDecisionDialog({ open: false, creator: null, action: null })}
              disabled={decisionSubmitting}
            >
              ยกเลิก
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => void handleDecisionConfirm(true)}
                disabled={
                  decisionSubmitting ||
                  (decisionDialog.creator
                    ? emailSendKey === `${decisionDialog.creator.id}:${decisionDialog.action === 'approve' ? 'approval' : 'rejection'}`
                    : false)
                }
                variant={decisionDialog.action === 'approve' ? 'success' : 'error'}
                center
              >
                {(decisionSubmitting || (decisionDialog.creator
                  ? emailSendKey === `${decisionDialog.creator.id}:${decisionDialog.action === 'approve' ? 'approval' : 'rejection'}`
                  : false)) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MailIcon className="w-5 h-5" />
                )}
                ยืนยันและส่งอีเมล
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
