import { Link } from 'react-router-dom';
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
import { FaGoogleDrive, FaLink } from "react-icons/fa";
import { Loader2 } from 'lucide-react';
import { HeroBanner } from '../landing/HeroBanner';

const DEFAULT_ITEMS_PER_PAGE = 10;
const STATUS_FILTER_ALL = 'all';
type ProjectStatusValue = 'ready' | 'new' | 'sold_out';
type StatusFilterValue = typeof STATUS_FILTER_ALL | ProjectStatusValue;

export function AffiliatePage() {
  return (
    <CampaignLayout>
      <AffiliateProjectList />
    </CampaignLayout>
  );
}

function AffiliateProjectList() {
  const [projects, setProjects] = useState<AffiliateProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<AffiliateProject | null>(null);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(STATUS_FILTER_ALL);
  const [page, setPage] = useState(1);
  const itemsPerPage = DEFAULT_ITEMS_PER_PAGE;

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const statusValue = statusFilter === STATUS_FILTER_ALL ? null : statusFilter;
    return projects.filter((p) => {
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

  return (
    <div id="affiliate_page">
      <div id="aff_intro_box" className='py-10'>
        <h2 className="text-center text-2xl font-bold text-primary mb-7">
          <span className='text-5xl'>เลือกโครงการที่ใช่</span><br/>
          <span className='text-3xl font-bold'>แล้วรับค่าแนะนำสูงสุด <span className='text-4xl'>50,000</span> บาท*</span>
        </h2>
        <a href='' title='ข้อกำหนดและเงื่อนไข' className='text-white bg-gradient-to-br from-orange-400 to-orange-600 px-7 py-4 rounded-full block w-fit mx-auto leading-none'>ข้อกำหนดและเงื่อนไข</a>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-border p-6 md:p-8">

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
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="sold_out">Sold Out</SelectItem>
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
                        <th className="px-4 w-1/5 md:px-6 py-3 text-center font-medium text-foreground">
                          ค่าแนะนำ
                        </th>
                        <th className="px-4 w-1/5 md:px-6 py-3 text-center font-medium text-foreground">
                          View Materials
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-muted/30">
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-7">
                              <div className="w-50 h-auto rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground aspect-square flex-shrink-0">
                                {project.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={project.imageUrl}
                                    alt={project.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="px-1 text-center">
                                    ไม่มีรูปภาพ
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xl mb-2 font-medium text-foreground">
                                  {project.name}
                                </h4>
                                <p className="text-neutral-500">
                                  {project.description}
                                </p>
                                {getStatusLabel(project.projectStatus) && (
                                  <div className={`mt-1 project-status-badge ${project.projectStatus}`}>
                                    <span>
                                      {getStatusLabel(project.projectStatus)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 align-center">
                            <div className="text-muted-foreground max-w-xs text-center">
                              {project.commission || 'จะประกาศคอมมิชชั่นเร็ว ๆ นี้'}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 align-center">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProject(project);
                                  setIsMaterialsOpen(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                              >
                                View Materials
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

      <Drawer
        direction="right"
        open={isMaterialsOpen && !!selectedProject}
        onOpenChange={(open) => {
          setIsMaterialsOpen(open);
          if (!open) {
            setSelectedProject(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader className='p-7'>
            <DrawerTitle>
              วัสดุสำหรับโปรโมต
            </DrawerTitle>
            <DrawerDescription>
              ดาวน์โหลดสื่อสำหรับใช้ทำคอนเทนต์ของคุณสำหรับโครงการนี้
            </DrawerDescription>
          </DrawerHeader>

          {selectedProject && (
            <div className="px-7 pb-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-30 h-auto rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground aspect-square flex-shrink-0">
                  {selectedProject.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedProject.imageUrl}
                      alt={selectedProject.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="px-1 text-center">
                      ไม่มีรูปภาพ
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl mb-2 font-medium text-foreground">
                    {selectedProject.name}
                  </h4>
                  <p className="text-neutral-500">
                    {selectedProject.description}
                  </p>
                  {getStatusLabel(selectedProject.projectStatus) && (
                    <p className="text-muted-foreground mt-0.5">
                      สถานะโครงการ:{' '}
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                        {getStatusLabel(selectedProject.projectStatus)}
                      </span>
                    </p>
                  )}
                  <p className="text-xl font-medium text-green-700">
                    {selectedProject.commission || 'จะประกาศคอมมิชชั่นเร็ว ๆ นี้'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-neutral-400 px-4 py-5 space-y-4">
                <p className="font-medium text-foreground">
                  ไฟล์สำหรับดาวน์โหลด
                </p>
                <div className="space-y-4">
                  {selectedProject.googleDriveUrl && (
                    <div className="space-y-1">
                      <a
                        href={selectedProject.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-primary px-3 py-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors gap-2"
                      >
                        <FaGoogleDrive className="w-4 h-4" />
                        เปิดโฟลเดอร์ Google Drive
                      </a>
                    </div>
                  )}
                  <div className="space-y-1 text-primary">
                    <a
                      href={selectedProject.materialsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-primary px-3 py-1.5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors gap-2"
                    >
                      <FaLink className="w-4 h-4" />
                      เปิดหน้า Landing Page ของโครงการ
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <DrawerClose className="items-center justify-center rounded-md border border-destructive text-destructive p-3 inline-block font-medium hover:bg-destructive hover:text-white transition-colors cursor-pointer w-fit min-w-30 mx-auto">
              ปิด
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
