'use client';

import { useEffect, useMemo, useState } from 'react';
import { CampaignLayout } from '../layout/CampaignLayout';
import { fetchAffiliateProjects, type AffiliateProject } from '../../utils/affiliate';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { FaGoogleDrive, FaLink } from 'react-icons/fa';
import { Loader2, Copy, Check, Download, FileImage, FileText, Film, ExternalLink, ArrowRight, X } from 'lucide-react';
import { HeroBanner } from '../landing/HeroBanner';
import { StatusBadge } from '../ui/status-badge';
import { LoginModal } from '../landing/LoginModal';
import { useSession } from '@/modules/context/SessionContext';
import { getAffiliateMaterialsByProject, saveAffiliateLinkIfUrlNewForCreator } from '@/modules/utils/storage';
import type { AffiliateMaterial } from '@/modules/types';
import { toast } from 'sonner';
import { StatusLabel } from '../ui/status-label';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const DEFAULT_ITEMS_PER_PAGE = 10;
const STATUS_FILTER_ALL = 'all';
type ProjectStatusValue = 'ready' | 'new';
type StatusFilterValue = typeof STATUS_FILTER_ALL | ProjectStatusValue;

export function AffiliatePage() {
  return (
    <CampaignLayout>
      <AffiliateProjectList />
    </CampaignLayout>
  );
}

function AffiliateProjectList() {
  const { currentUserId, handleLogin: sessionLogin } = useSession();
  const isLoggedIn = !!currentUserId;
  const [projects, setProjects] = useState<AffiliateProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<AffiliateProject | null>(null);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(STATUS_FILTER_ALL);
  const [page, setPage] = useState(1);
  const itemsPerPage = DEFAULT_ITEMS_PER_PAGE;

  // Referral link state
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShorteningLink, setIsShorteningLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Materials state for drawer
  const [drawerMaterials, setDrawerMaterials] = useState<AffiliateMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusValue = statusFilter === STATUS_FILTER_ALL ? null : statusFilter;
    return projects
      .filter((p) => p.projectStatus !== 'sold_out')
      .filter((p) => {
        const matchesSearch =
          !q ||
          (p.name?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false);
        const matchesStatus =
          statusValue === null || (p.projectStatus ?? '') === statusValue;
        return matchesSearch && matchesStatus;
      });
  }, [projects, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const paginatedProjects = useMemo(
    () =>
      filteredProjects.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
      ),
    [filteredProjects, page, itemsPerPage]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const getStatusLabel = (status?: string): string | null => {
    if (!status) return null;
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'new':
        return 'New';
      case 'sold_out':
        return 'Sold Out';
      default:
        return status;
    }
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchAffiliateProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load affiliate projects', err);
        setError('ไม่สามารถโหลดข้อมูลโครงการได้');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Generate referral short link when drawer opens (pass project — state from setSelectedProject is not updated until after this handler runs)
  const generateReferralLink = async (project: AffiliateProject) => {
    if (!currentUserId) return;
    setIsShorteningLink(true);
    setShortUrl(null);

    try {
      const res = await fetch(`${BASE_PATH}/api/affiliate/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          creatorId: currentUserId,
          projectUrl: project.materialsUrl,
          utmSource: 'creator_club_affiliate',
          utmMedium: 'affiliate',
          utmCampaign: 'creator_club_affiliate',
          utmId: currentUserId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShortUrl(data.shortUrl);
      } else {
        // Fallback to long URL
        setShortUrl(`${project.materialsUrl}?utm_source=creator_club_affiliate&utm_medium=affiliate&utm_campaign=creator_club_affiliate&utm_id=${currentUserId}`);
      }
    } catch {
      setShortUrl(`${project.materialsUrl}?utm_source=creator_club_affiliate&utm_medium=affiliate&utm_campaign=creator_club_affiliate&utm_id=${currentUserId}`);
    } finally {
      setIsShorteningLink(false);
    }
  };

  // Load materials for a project when drawer opens
  const loadMaterials = async (projectId: string) => {
    setMaterialsLoading(true);
    setDrawerMaterials([]);
    try {
      const materials = await getAffiliateMaterialsByProject(projectId);
      setDrawerMaterials(materials);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shortUrl) return;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setLinkCopied(true);
      toast.success('คัดลอกลิงก์แล้ว!');
      setTimeout(() => setLinkCopied(false), 2000);

      if (currentUserId && selectedProject) {
        try {
          await saveAffiliateLinkIfUrlNewForCreator({
            creatorId: currentUserId,
            url: shortUrl,
            projectId: selectedProject.id,
            campaignName: selectedProject.name,
          });
        } catch (err) {
          console.error('Failed to persist copied affiliate link:', err);
        }
      }
    } catch {
      toast.error('ไม่สามารถคัดลอกได้');
    }
  };

  const handleDownload = async (material: AffiliateMaterial) => {
    setDownloadingId(material.id);
    try {
      const response = await fetch(material.fileUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext = material.fileUrl.split('.').pop()?.split('?')[0] ?? 'bin';
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${material.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <FileImage className="w-4 h-4 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'video':
        return <Film className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const openDrawer = (project: AffiliateProject) => {
    setSelectedProject(project);
    setIsMaterialsOpen(true);
    setShortUrl(null);
    setLinkCopied(false);
    void generateReferralLink(project);
    loadMaterials(project.id);
  };

  return (
    <div id="affiliate_page">
      <div id="aff_intro_box" className='py-7 md:py-10'>
        <h2 className="text-center text-2xl font-bold text-primary mb-7">
          <span className='text-4xl lg:text-5xl'>เลือกโครงการที่ใช่</span><br/>
          <span className='text-3xl lg:text-3xl font-bold'>แล้วรับค่าคอมมิชชันสูงสุด <span className='text-4xl'>500,000</span> บาท*</span>
        </h2>
        <a href={`${BASE_PATH}/affiliate/terms-and-conditions`} title='ข้อกำหนดและเงื่อนไข' className='text-white bg-gradient-to-br from-orange-400 to-orange-600 px-7 py-4 rounded-full block w-fit mx-auto leading-none'>ข้อกำหนดและเงื่อนไข</a>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-border p-6 lg:p-8">

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดข้อมูลโครงการ...</span>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 px-4 bg-destructive/5 border border-destructive/40 rounded-xl text-destructive text-center">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            ขณะนี้ยังไม่มีโครงการสำหรับ Affiliate
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="affiliate-search" className="text-xl">ค้นหาโครงการ</Label>
                <Input
                  id="affiliate-search"
                  type="search"
                  placeholder="ค้นหาจากชื่อ หรือรายละเอียด"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm border-border text-base"
                />
              </div>
              <div className="w-full sm:w-[180px] space-y-2">
                <Label htmlFor="affiliate-status">สถานะ</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
                >
                  <SelectTrigger id="affiliate-status" className='border-border'>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_FILTER_ALL}>ทั้งหมด</SelectItem>
                    <SelectItem value="ready">โครงการพร้อมอยู่</SelectItem>
                    <SelectItem value="new">โครงการใหม่</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(searchQuery.trim() || statusFilter !== STATUS_FILTER_ALL) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter(STATUS_FILTER_ALL);
                    setPage(1);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                ไม่พบโครงการที่ตรงกับตัวกรอง
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="min-w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-4 w-3/5 md:px-6 py-3 text-left font-medium text-foreground">
                          โครงการ
                        </th>
                        <th className="px-4 w-1/5 md:px-6 py-3 text-center font-medium text-foreground hidden lg:table-cell">
                          ค่าแนะนำ
                        </th>
                        <th className="px-4 w-1/5 md:px-6 py-3 text-center font-medium text-foreground hidden lg:table-cell">
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-muted/30">
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-4 lg:gap-7">
                              <div className="w-45 h-auto rounded-md bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground aspect-square flex-shrink-0 relative">
                                {project.imageUrl || project.thumbUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={project.imageUrl || project.thumbUrl}
                                    alt={project.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="px-1 text-center">
                                    no thumbnail
                                  </span>
                                )}
                                <StatusLabel className="block md:hidden z-10" status={getStatusLabel(project.projectStatus)} />
                                <div className='absolute block md:hidden top-0 right-0 bg-gradient-to-bl from-black/50 via-black/30 to-transparent w-full h-full'></div>
                              </div>
                              <div>
                                <h4 className="text-xl mb-2 font-medium text-foreground flex items-center gap-2">
                                  { project.name }
                                  <StatusBadge className="hidden md:flex" status={project.projectStatus ?? null} />
                                </h4>
                                <p className="text-neutral-500 hidden md:block mb-3">
                                  {project.description}
                                </p>
                                <div className="flex lg:hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isLoggedIn) {
                                        setIsLoginModalOpen(true);
                                        return;
                                      }
                                      openDrawer(project);
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                                  >
                                    Get Link
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 align-center hidden lg:table-cell">
                            <div className="text-muted-foreground max-w-xs text-center">
                              {project.commission || 'จะประกาศคอมมิชชั่นเร็ว ๆ นี้'}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 align-center hidden lg:table-cell">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isLoggedIn) {
                                    setIsLoginModalOpen(true);
                                    return;
                                  }
                                  openDrawer(project);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                              >
                                Get Link <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    แสดง {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filteredProjects.length)} จาก {filteredProjects.length} โครงการ
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={page <= 1}
                        />
                      </PaginationItem>
                      {totalPages <= 7
                        ? Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <PaginationItem key={p}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(p);
                                }}
                                isActive={page === p}
                                className="cursor-pointer"
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          ))
                        : (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); setPage(1); }}
                                  isActive={page === 1}
                                  className="cursor-pointer"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {page > 3 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                              {[page - 1, page, page + 1]
                                .filter((p) => p >= 2 && p <= totalPages - 1)
                                .map((p) => (
                                  <PaginationItem key={p}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => { e.preventDefault(); setPage(p); }}
                                      isActive={page === p}
                                      className="cursor-pointer"
                                    >
                                      {p}
                                    </PaginationLink>
                                  </PaginationItem>
                                ))}
                              {page < totalPages - 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                              {totalPages > 1 && (
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setPage(totalPages); }}
                                    isActive={page === totalPages}
                                    className="cursor-pointer"
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              )}
                            </>
                          )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                          className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          aria-disabled={page >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── GET LINK DRAWER ── */}
      <Drawer
        direction="right"
        open={isMaterialsOpen && !!selectedProject}
        onOpenChange={(open) => {
          setIsMaterialsOpen(open);
          if (!open) {
            setSelectedProject(null);
            setShortUrl(null);
            setLinkCopied(false);
            setDrawerMaterials([]);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className='p-7'>
            <DrawerTitle>
              สื่อสำหรับโปรโมต
            </DrawerTitle>
            <DrawerDescription>
              รับลิงก์แนะนำ และดาวน์โหลดสื่อสำหรับโปร​โมตโครงการนี้
            </DrawerDescription>
            <DrawerClose className="absolute top-4 right-4">
              <X className="w-7 h-7 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
            </DrawerClose>
          </DrawerHeader>

          {selectedProject && (
            <div className="px-7 pb-7 space-y-5 overflow-y-auto">
              {/* ── Referral Link Card ── */}
              <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FaLink className="w-4 h-4 text-orange-500" />
                  <h5 className="font-semibold text-foreground text-sm">ลิงก์แนะนำของคุณ</h5>
                </div>

                {isShorteningLink ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังสร้างลิงก์...</span>
                  </div>
                ) : shortUrl ? (
                  <div className="flex flex-col lg:flex-row items-stretch gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shortUrl}
                      className="flex-1 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-mono text-foreground select-all focus:outline-none focus:ring-2 focus:ring-orange-300"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer w-fit ${
                        linkCopied
                          ? 'bg-green-500 text-white'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                      }`}
                    >
                      {linkCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          คัดลอกแล้ว!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          คัดลอก
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">ไม่สามารถสร้างลิงก์ได้</p>
                )}
                <p className="text-xs text-orange-600/70">
                  แชร์ลิงก์นี้เพื่อรับค่าคอมมิชชันเมื่อมีผู้สนใจผ่านลิงก์ของคุณ
                </p>
              </div>

              {/* ── Materials List ── */}
              <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                <h5 className="font-semibold text-foreground">ข้อมูลโครงการ</h5>

                {/* Project Info */}
                <div className="flex flex-col lg:flex-row items-center gap-5">
                  <div className="w-full lg:w-1/3 h-auto rounded-sm bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                    {selectedProject.imageUrl || selectedProject.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedProject.imageUrl || selectedProject.thumbUrl}
                        alt={selectedProject.name}
                        className="w-full h-full object-cover aspect-square lg:aspect-auto"
                      />
                    ) : (
                      <span className="px-1 text-center">
                        no thumbnail
                      </span>
                    )}
                  </div>
                  <div className="w-full lg:flex-1 flex flex-col gap-2">
                    <h4 className="text-2xl font-medium text-foreground">
                      {selectedProject.name}
                    </h4>
                    {selectedProject.description && (
                      <p className="text-sm text-neutral-500 line-clamp-2">
                        {selectedProject.description}
                      </p>
                    )}
                    {getStatusLabel(selectedProject.projectStatus) && (
                      <StatusBadge status={selectedProject.projectStatus ?? null} />
                    )}
                    <div className='mt-2 mb-5'>
                      {selectedProject.commission && (
                        <p className="font-medium">
                          ค่าแนะนำ: <span className="text-2xl text-green-700">{selectedProject.commission}</span>
                        </p>
                      )}
                      {!selectedProject.commission && (
                        <p className="text-sm text-neutral-500">สอบถามค่าแนะนำที่ Line Official</p>
                      )}
                    </div>

                    {/* ── Landing Page Link ── */}
                    {selectedProject.materialsUrl && (
                      <a
                        href={selectedProject.materialsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-lg gap-2 px-3 py-2 text-sm font-medium bg-gray-100 text-neutral-800 hover:bg-gray-200 hover:text-neutral-900 transition-colors cursor-pointer w-fit"
                      >
                        หน้าเว็บโครงการ
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedProject.googleDriveUrl && (
                      <a
                        href={selectedProject.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                      >
                        <FaGoogleDrive className="w-3.5 h-3.5" />
                        Google Drive สำหรับดาวน์โหลดสื่อ
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={(id, role) => sessionLogin(id, role)}
        />
      )}
    </div>
  );
}
