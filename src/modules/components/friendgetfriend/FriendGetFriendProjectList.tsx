'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { fetchFriendGetFriendProjects } from '@/modules/utils/friendgetfriend';
import type { AffiliateProject } from '@/modules/utils/affiliate';

import { LoginModal } from '../landing/LoginModal';
import { useSession } from '@/modules/context/SessionContext';
import { getSession } from '@/modules/utils/auth';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const DEFAULT_ITEMS_PER_PAGE = 10;
const STATUS_FILTER_ALL = 'all';
type ProjectStatusValue = 'ready' | 'new' | 'sold_out';
type StatusFilterValue = typeof STATUS_FILTER_ALL | ProjectStatusValue;

type FriendGetFriendProjectListProps = {
  onLogin?: (id: string, role: 'creator' | 'admin') => void;
  onRecommend?: (project: AffiliateProject) => void;
};

export function FriendGetFriendProjectList({
  onLogin,
  onRecommend,
}: FriendGetFriendProjectListProps) {
  const { currentUserId, userRole, handleLogin: sessionLogin } = useSession();
  const cookieSession = getSession();

  const isLoggedIn = !!currentUserId || !!cookieSession;
  const effectiveRole = userRole ?? cookieSession?.role ?? null;

  const [projects, setProjects] = useState<AffiliateProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
      filteredProjects.slice((page - 1) * itemsPerPage, page * itemsPerPage),
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
        const data = await fetchFriendGetFriendProjects();
        setProjects(data);
      } catch (err) {
        console.error('Failed to load friendgetfriend projects', err);
        setError('ไม่สามารถโหลดข้อมูลโครงการได้');
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const handleRecommend = (project: AffiliateProject) => {
    if (!isLoggedIn || !effectiveRole) {
      setIsLoginModalOpen(true);
      return;
    }

    if (effectiveRole !== 'creator') {
      toast.error('เฉพาะ Creator Club ที่ลงทะเบียนเท่านั้นจึงจะแนะนำเพื่อนได้');
      return;
    }

    onRecommend?.(project);
  };

  return (
    <div className="container pt-10 pb-8">
      <div className="bg-white rounded-2xl shadow-xl border border-border p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <h2 className="text-center text-2xl font-bold text-primary mb-2">เลือกโครงการที่ใช่</h2>
            <p className="text-muted-foreground text-center sm:text-left">
              รายละเอียดโครงการสามารถดูได้ทุกคน แต่ฟอร์มแนะนำเพื่อนมีเฉพาะ Creator Club ที่ลงทะเบียนแล้วเท่านั้น
            </p>
          </div>
        </div>

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
            ขณะนี้ยังไม่มีโครงการสำหรับ Friend Get Friend
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="fgf-search" className="text-xl">
                  ค้นหาโครงการ
                </Label>
                <Input
                  id="fgf-search"
                  type="search"
                  placeholder="ค้นหาจากชื่อ หรือรายละเอียด"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm border-border text-base"
                />
              </div>
              <div className="w-full sm:w-[180px] space-y-2">
                <Label htmlFor="fgf-status">สถานะ</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
                >
                  <SelectTrigger id="fgf-status" className="border-border">
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
                          แนะนำเพื่อน
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
                                  <div
                                    className={`mt-1 project-status-badge ${project.projectStatus}`}
                                  >
                                    <span>{getStatusLabel(project.projectStatus)}</span>
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
                                onClick={() => handleRecommend(project)}
                                className="inline-flex items-center justify-center rounded-lg border border-primary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                              >
                                แนะนำเพื่อน
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
                    แสดง{' '}
                    {(page - 1) * itemsPerPage + 1}–
                    {Math.min(page * itemsPerPage, filteredProjects.length)} จาก{' '}
                    {filteredProjects.length} โครงการ
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
                          className={
                            page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                          }
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setPage(1);
                                  }}
                                  isActive={page === 1}
                                  className="cursor-pointer"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                              {page > 3 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              {[page - 1, page, page + 1]
                                .filter((p) => p >= 2 && p <= totalPages - 1)
                                .map((p) => (
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
                                ))}
                              {page < totalPages - 2 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              {totalPages > 1 && (
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPage(totalPages);
                                    }}
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
                          className={
                            page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                          }
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

        {isLoginModalOpen && (
          <LoginModal
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={(id, role) => (onLogin ? onLogin(id, role) : sessionLogin(id, role))}
          />
        )}
      </div>
    </div>
  );
}

