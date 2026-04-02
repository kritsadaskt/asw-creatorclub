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
  Eye,
  LayoutGrid,
  Loader2,
  MailIcon,
  SendHorizontal,
  Table,
  UserRound,
} from 'lucide-react';
import { FaPhone } from 'react-icons/fa6';
import { BASE_PATH } from '@/lib/publicPath';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';

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

const CATEGORIES = [
  'ทั้งหมด',
  'แฟชั่น',
  'ความงาม',
  'อาหาร',
  'ท่องเที่ยว',
  'เทคโนโลยี',
  'ไลฟ์สไตล์',
  'กีฬา',
  'เกม',
  'อื่นๆ'
];

export function AdminDashboard() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<CreatorProfile[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'inactive'>('pending');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [followerRange, setFollowerRange] = useState('all');
  const [customFollowers, setCustomFollowers] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatorAffiliateLinks, setCreatorAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [affiliateLinksLoading, setAffiliateLinksLoading] = useState(false);
  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    creator: CreatorProfile | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, creator: null, action: null });
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  /** `${creatorId}:approval` | `${creatorId}:rejection` while that request is in flight */
  const [emailSendKey, setEmailSendKey] = useState<string | null>(null);

  const [adminTab, setAdminTab] = useState<'creators' | 'fgf'>('creators');
  const [fgfLeads, setFgfLeads] = useState<FgfLeadWithProjects[]>([]);
  const [fgfLoading, setFgfLoading] = useState(false);
  const [fgfSearch, setFgfSearch] = useState('');
  const [fgfCisFilter, setFgfCisFilter] = useState<'all' | 'uploaded' | 'pending'>('all');
  const [selectedFgf, setSelectedFgf] = useState<FgfLeadWithProjects | null>(null);
  const [fgfNestedCreator, setFgfNestedCreator] = useState<CreatorProfile | null>(null);
  const [fgfNestedCreatorLoading, setFgfNestedCreatorLoading] = useState(false);
  const [fgfCisSubmitting, setFgfCisSubmitting] = useState(false);
  const [projectNameById, setProjectNameById] = useState<Record<string, string>>({});

  const approvalOptions: Array<{
    value: typeof approvalFilter;
    label: string;
  }> = [
    { value: 'pending', label: 'คำขอเข้าร่วม (รอการอนุมัติ)' },
  ];

  const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));

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
    if (adminTab === 'creators') {
      setSelectedFgf(null);
      setFgfNestedCreator(null);
    }
    if (adminTab === 'fgf') setSelectedCreator(null);
  }, [adminTab]);

  useEffect(() => {
    if (adminTab !== 'fgf') return;
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
  }, [adminTab]);

  useEffect(() => {
    filterCreators();
  }, [creators, selectedCategory, searchQuery, followerRange, customFollowers, approvalFilter]);

  const affiliateDrawerCreator = selectedCreator ?? fgfNestedCreator;

  useEffect(() => {
    const loadCreatorAffiliateLinks = async () => {
      if (!affiliateDrawerCreator) {
        setCreatorAffiliateLinks([]);
        return;
      }

      try {
        setAffiliateLinksLoading(true);
        const links = await getAffiliateLinksByCreator(affiliateDrawerCreator.id);
        setCreatorAffiliateLinks(links);
      } catch (error) {
        console.error('Error loading affiliate links by creator:', error);
        toast.error('ไม่สามารถโหลดลิงก์ Affiliate ของครีเอเตอร์ได้');
      } finally {
        setAffiliateLinksLoading(false);
      }
    };

    void loadCreatorAffiliateLinks();
  }, [affiliateDrawerCreator]);

  const loadCreators = async () => {
    try {
      setLoading(true);
      const allCreators = await getCreators();
      setCreators(allCreators);
    } catch (error) {
      console.error('Error loading Creators:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filterCreators = () => {
    let filtered = [...creators];

    // Category filter
    if (selectedCategory !== 'ทั้งหมด') {
      filtered = filtered.filter(
        (creator) => creator.categories && creator.categories.includes(selectedCategory),
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(creator =>
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Followers filter
    if (followerRange === 'custom' && customFollowers) {
      const min = parseInt(customFollowers);
      filtered = filtered.filter(creator => creator.followers >= min);
    } else if (followerRange !== 'all') {
      const ranges: { [key: string]: { min: number; max?: number } } = {
        '0-1k': { min: 0, max: 1000 },
        '1k-10k': { min: 1000, max: 10000 },
        '10k-50k': { min: 10000, max: 50000 },
        '50k-100k': { min: 50000, max: 100000 },
        '100k-500k': { min: 100000, max: 500000 },
        '500k+': { min: 500000 }
      };
      
      const range = ranges[followerRange];
      if (range) {
        filtered = filtered.filter(creator => {
          const followers = creator.followers;
          if (range.max) {
            return followers >= range.min && followers < range.max;
          }
          return followers >= range.min;
        });
      }
    }

    // Approval status filter
    // Default "all" excludes rejected creators; rejected are visible only in the rejected filter.
    if (approvalFilter === 'all') {
      filtered = filtered.filter((creator) => creator.approvalStatus !== 0);
    } else if (approvalFilter === 'pending') {
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
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
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
        <p className="text-foreground">
          {creator.name} {creator.lastName}
        </p>
      </div>

      <div>
        <label className="text-muted-foreground">อีเมล</label>
        <p className="text-foreground">{creator.email}</p>
      </div>

      <div>
        <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
        <p className="text-foreground">{creator.phone}</p>
      </div>

      <div>
        <label className="text-muted-foreground">หมวดหมู่</label>
        <p className="text-foreground">
          {creator.categories && creator.categories.length > 0 ? creator.categories.join(', ') : '-'}
        </p>
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
                            className="block text-sm text-primary hover:underline break-all"
                          >
                            {postLink}
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

      <Tabs
        value={adminTab}
        onValueChange={(value) => setAdminTab(value as 'creators' | 'fgf')}
        className="gap-6"
      >
        <TabsList className="mb-2">
          <TabsTrigger value="creators">ครีเอเตอร์</TabsTrigger>
          <TabsTrigger value="fgf">Friend Get Friends</TabsTrigger>
        </TabsList>

        <TabsContent
          value="creators"
          forceMount
          className="mt-0 flex flex-col gap-6 data-[state=inactive]:hidden"
        >
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-neutral-700 text-xl font-medium mb-4">ค้นหาและกรองข้อมูล</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="flex flex-col gap-1.5">
            <label>ค้นหา (ชื่อ / อีเมล)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา..."
              className="px-4 py-2.5 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>สถานะการอนุมัติ</label>
            <Select
              options={approvalOptions}
              value={approvalOptions.find((o) => o.value === approvalFilter)}
              onChange={(option) => {
                setApprovalFilter((option?.value ?? 'all') as typeof approvalFilter);
              }}
              isClearable={false}
              classNamePrefix="react-select"
              placeholder="ทั้งหมด"
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-primary">
            ครีเอเตอร์ทั้งหมด ({filteredCreators.length})
          </h3>
          
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-input-background text-muted-foreground hover:bg-border'
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-input-background text-muted-foreground hover:bg-border'
              }`}
              title="มุมมองตาราง"
            >
              <Table size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8 flex items-center gap-2 justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
            กำลังโหลดข้อมูล
          </p>
        ) : filteredCreators.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ไม่พบข้อมูล Creator
          </p>
        ) : viewMode === 'card' ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCreators.map((creator) => (
              <div
                key={creator.id}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors flex flex-col"
              >
                {/* Profile Image */}
                <div className="flex justify-center mb-4">
                  {getProfileImageUrl(creator) ? (
                    <ImageWithFallback
                      src={getProfileImageUrl(creator)!}
                      alt={creator.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                      <span className="text-primary text-2xl">
                        {creator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-center mb-4">
                  <h4 className="text-foreground mb-1">{creator.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">{creator.email}</p>
                  <div className="mt-2 flex justify-center">
                    {approvalStatusBadge(creator)}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm mb-4 flex-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">หมวดหมู่:</span>
                    <span className="text-foreground">
                      {creator.categories && creator.categories.length > 0
                        ? creator.categories.join(', ')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">โซเชียล:</span>
                    <span className="text-foreground">{getSocialLinks(creator).length} ช่องทาง</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-2 space-y-2">
                  <Button
                    onClick={() => setSelectedCreator(creator)}
                    variant="outline"
                    fullWidth
                    center
                  >
                    <Eye className="w-4 h-4" />
                    ดูรายละเอียด
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ชื่อ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">อีเมล</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">หมวดหมู่</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โทรศัพท์</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โซเชียล</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">สถานะ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((creator) => (
                  <tr key={creator.id} className="border-b border-border hover:bg-input-background/30 transition-colors">
                    <td className="py-3 px-4">
                      {getProfileImageUrl(creator) ? (
                        <ImageWithFallback
                          src={getProfileImageUrl(creator)!}
                          alt={creator.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                          <span className="text-primary text-sm">
                            {creator.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{creator.name}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{creator.email}</td>
                    <td className="py-3 px-4 text-sm text-foreground">
                      {creator.categories && creator.categories.length > 0
                        ? creator.categories.join(', ')
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground">{creator.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{getSocialLinks(creator).length} ช่องทาง</td>
                    <td className="py-3 px-4">
                      {approvalStatusBadge(creator)}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        type="button"
                        onClick={() => setSelectedCreator(creator)}
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
        )}
      </div>
        </TabsContent>

        <TabsContent
          value="fgf"
          forceMount
          className="mt-0 flex flex-col gap-6 data-[state=inactive]:hidden"
        >
          <div className="bg-white rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-neutral-700 text-xl font-medium mb-4">ค้นหาและกรองลีด</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
              <div className="flex flex-col gap-1.5">
                <label>ค้นหา (ชื่อ / อีเมล / เบอร์ / ref)</label>
                <input
                  type="text"
                  value={fgfSearch}
                  onChange={(e) => setFgfSearch(e.target.value)}
                  placeholder="ค้นหา..."
                  className="px-4 py-2.5 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label>สถานะ CIS</label>
                <Select
                  options={fgfCisOptions}
                  value={fgfCisOptions.find((o) => o.value === fgfCisFilter)}
                  onChange={(option) => {
                    setFgfCisFilter((option?.value ?? 'all') as typeof fgfCisFilter);
                  }}
                  isClearable={false}
                  classNamePrefix="react-select"
                  placeholder="ทั้งหมด"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-primary mb-4">ลีด Friend Get Friends ({filteredFgfLeads.length})</h3>
            {fgfLoading ? (
              <p className="text-muted-foreground text-center py-8 flex items-center gap-2 justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
                กำลังโหลดข้อมูล
              </p>
            ) : filteredFgfLeads.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">ไม่พบลีด</p>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">วันที่</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ผู้ถูกแนะนำ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">อีเมล</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ผู้แนะนำ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">โครงการ</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">CIS</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFgfLeads.map(({ lead, projectIds }) => (
                      <tr
                        key={lead.id}
                        className="border-b border-border hover:bg-input-background/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-foreground whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {[lead.leadName, lead.leadLastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">{lead.leadEmail}</td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {[lead.referrerName, lead.referrerLastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground max-w-[200px] truncate" title={projectIds.map((id) => projectNameById[id] || id).join(', ')}>
                          {formatFgfProjectCell(projectIds)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {lead.uploadedToCrm ? (
                            <span className="text-emerald-700">ส่ง CIS แล้ว</span>
                          ) : (
                            <span className="text-muted-foreground">ยังไม่ส่ง</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            type="button"
                            onClick={() => setSelectedFgf({ lead, projectIds })}
                            variant="ghost"
                            className="cursor-pointer rounded-full p-2"
                            aria-label="ดูรายละเอียดลีด"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        <DrawerContent className="overflow-y-auto overflow-x-hidden">
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
                    {fgfNestedCreator.name} · {fgfNestedCreator.email}
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
