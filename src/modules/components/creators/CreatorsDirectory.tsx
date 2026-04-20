'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, LayoutGrid, Loader2, Mail, Phone, Table, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CreatorProfile } from '@/modules/types';
import { getCreators } from '@/modules/utils/storage';
import { Button } from '@/modules/components/shared/Button';
import { FileXIcon } from 'lucide-react';
import {
  PaginationEllipsis,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/modules/components/ui/pagination';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/modules/components/ui/drawer';
import { ImageWithFallback } from '@/modules/components/figma/ImageWithFallback';
import { getProfileImageUrl } from '@/modules/utils/profileImage';
import { CREATOR_CATEGORIES } from '@/modules/components/landing/registerInviteCategories';

const Select = dynamic(() => import('react-select').then((mod) => mod.default), {
  ssr: false,
}) as typeof import('react-select').default;

const CATEGORIES = ['ทั้งหมด', ...CREATOR_CATEGORIES.map((category) => category.label)];

const followerOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '0-1k', label: '0 - 1,000' },
  { value: '1k-10k', label: '1,000 - 10,000' },
  { value: '10k-50k', label: '10,000 - 50,000' },
  { value: '50k-100k', label: '50,000 - 100,000' },
  { value: '100k-500k', label: '100,000 - 500,000' },
  { value: '500k+', label: '500,000+' },
];

const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));

const ranges: { [key: string]: { min: number; max?: number } } = {
  '0-1k': { min: 0, max: 1000 },
  '1k-10k': { min: 1000, max: 10000 },
  '10k-50k': { min: 10000, max: 50000 },
  '50k-100k': { min: 50000, max: 100000 },
  '100k-500k': { min: 100000, max: 500000 },
  '500k+': { min: 500000 },
};

const PAGE_SIZE = 12;

export function CreatorsDirectory() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [followerRange, setFollowerRange] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [page, setPage] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allCreators = await getCreators();
        setCreators(
          allCreators.filter(
            (c) => c.approvalStatus === 1 && !c.isAdmin && !c.isMkt,
          ),
        );
      } catch (error) {
        console.error('Error loading approved creators:', error);
        toast.error('ไม่สามารถโหลดข้อมูลครีเอเตอร์ได้');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredCreators = useMemo(() => {
    let rows = creators;

    if (selectedCategory !== 'ทั้งหมด') {
      rows = rows.filter(
        (creator) => creator.categories && creator.categories.includes(selectedCategory),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((creator) => {
        const pool = [
          creator.name,
          creator.lastName ?? '',
          creator.email,
          creator.phone,
          creator.baseLocation,
          creator.province ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return pool.includes(q);
      });
    }

    if (followerRange !== 'all') {
      const range = ranges[followerRange];
      if (range) {
        rows = rows.filter((creator) => {
          const followers = creator.followers;
          if (range.max) {
            return followers >= range.min && followers < range.max;
          }
          return followers >= range.min;
        });
      }
    }

    return rows;
  }, [creators, selectedCategory, searchQuery, followerRange]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, followerRange]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCreators.length / PAGE_SIZE)),
    [filteredCreators.length],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedCreators = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCreators.slice(start, start + PAGE_SIZE);
  }, [filteredCreators, page]);

  const CreatorsHeader = () => {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
        <div className="container">
          <h2 className="mb-2 text-2xl font-semibold text-primary">รายชื่อครีเอเตอร์ (Approved)</h2>
          <p className="text-sm text-muted-foreground">
            สำหรับทีม Online Marketing: ค้นหา กรอง และส่งออกข้อมูลครีเอเตอร์ที่ผ่านการอนุมัติแล้ว
          </p>
        </div>
      </div>
    )
  }

  const CreatorCard = ({ creator }: { creator: CreatorProfile }) => {
    const fullName = [creator.name, creator.lastName].filter(Boolean).join(' ');
    const socialCount = Object.values(creator.socialAccounts).filter(Boolean).length;
    return (
      <div
        key={creator.id}
        onClick={() => setSelectedCreator(creator)}
        className="rounded-xl border border-border p-4 transition-colors hover:border-primary/40 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-medium text-foreground">{fullName}</div>
            <div className="truncate text-sm text-muted-foreground">{creator.email}</div>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Approved
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <a
              href={`tel:${creator.phone}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {creator.phone || '-'}
            </a>
          </div>
          <div className="">
            <div className="text-xs text-muted-foreground">พื้นที่ / จังหวัด</div>
            <div className="truncate text-foreground">
              {[creator.baseLocation, creator.province].filter(Boolean).join(' / ') || '-'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-2">หมวดหมู่</div>
            <div className="text-foreground">
              {creator.categories && creator.categories.length > 0 ?
                <div className="flex flex-wrap gap-2">
                  {creator.categories.map((category) => (
                    <div key={category} className="flex shrink-0 items-center gap-2 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                      {category}
                    </div>
                  ))}
                </div>
                : '-'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <CreatorsHeader />
      <div className="container mx-auto py-6">
        <div className="mb-6 rounded-xl border border-border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-neutral-700">ค้นหาและกรองข้อมูล</h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">ค้นหา (ชื่อ / อีเมล / เบอร์ / จังหวัด)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์คำค้นหา..."
                className="rounded border border-border bg-input-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">หมวดหมู่</label>
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
              <label className="text-sm text-muted-foreground">ผู้ติดตาม (Follower)</label>
              <Select
                options={followerOptions}
                value={followerOptions.find((o) => o.value === followerRange)}
                onChange={(option) => {
                  setFollowerRange(option?.value ?? 'all');
                }}
                isClearable={false}
                classNamePrefix="react-select"
                placeholder="ทั้งหมด"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-primary">
                ครีเอเตอร์ที่ผ่านการอนุมัติ ({filteredCreators.length.toLocaleString()} คน)
              </h3>
              <p className="text-xs text-muted-foreground">
                แสดงเฉพาะครีเอเตอร์ที่สถานะอนุมัติแล้ว คลิกชื่อเพื่อดูรายละเอียด
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`rounded-lg p-2 transition-colors cursor-pointer ${
                    viewMode === 'card'
                      ? 'bg-primary text-white'
                      : 'bg-input-background text-muted-foreground hover:bg-border'
                  }`}
                  title="มุมมองการ์ด"
                  aria-pressed={viewMode === 'card'}
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`rounded-lg p-2 transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-primary text-white'
                      : 'bg-input-background text-muted-foreground hover:bg-border'
                  }`}
                  title="มุมมองตาราง"
                  aria-pressed={viewMode === 'table'}
                >
                  <Table className="h-5 w-5" />
                </button>
              </div>

              <Button
                type="button"
                variant="primary"
                center
                disabled={filteredCreators.length === 0}
                onClick={() => {
                  void import('@/modules/utils/exportCreators').then(({ exportCreatorsToXlsx }) =>
                    exportCreatorsToXlsx(filteredCreators),
                  );
                }}
              >
                <FileXIcon className="h-5 w-5" />
                Export
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              กำลังโหลดข้อมูลครีเอเตอร์...
            </p>
          ) : filteredCreators.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ไม่พบข้อมูลครีเอเตอร์ตามเงื่อนไขที่เลือก
            </p>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedCreators.map((creator) => {
                return (
                  <CreatorCard key={creator.id} creator={creator} />
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ชื่อ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">อีเมล</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">โทรศัพท์</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      พื้นที่ / จังหวัด
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">หมวดหมู่</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCreators.map((creator) => {
                    const socialCount = Object.values(creator.socialAccounts).filter(Boolean).length;
                    return (
                      <tr
                        key={creator.id}
                        className="border-b border-border/80 hover:bg-input-background/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedCreator(creator)}
                      >
                        <td className="px-4 py-2.5 text-sm text-foreground">
                          {[creator.name, creator.lastName].filter(Boolean).join(' ')}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{creator.email}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">{creator.phone}</td>
                        <td className="px-4 py-2.5 text-sm text-foreground">
                          {[creator.baseLocation, creator.province].filter(Boolean).join(' / ')}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground">
                          {creator.categories && creator.categories.length > 0
                            ? creator.categories.join(', ')
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground">
                          <Button
                            type="button"
                            variant="ghost"
                            className="cursor-pointer rounded-full p-2"
                            center
                            onClick={() => setSelectedCreator(creator)}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredCreators.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground shrink-0">
                แสดง {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredCreators.length)} จาก {filteredCreators.length} คน
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
                  {totalPages <= 7 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
                  ) : (
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
          )}
        </div>
      </div>

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
                <div className="flex items-start justify-between gap-4">
                  <DrawerTitle>รายละเอียด Creator</DrawerTitle>
                  <DrawerClose className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="w-5 h-5" />
                    <span className="sr-only">ปิด</span>
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <div className="px-7 pb-7 space-y-4">
                <div className="flex justify-center mb-2">
                  {getProfileImageUrl(selectedCreator) ? (
                    <ImageWithFallback
                      src={getProfileImageUrl(selectedCreator)!}
                      alt={selectedCreator.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                      <span className="text-primary text-5xl">{selectedCreator.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
                  <p className="text-foreground">
                    {[selectedCreator.name, selectedCreator.lastName].filter(Boolean).join(' ')}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground">อีเมล</label>
                  <p className="text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href={`mailto:${selectedCreator.email}`} className="text-primary hover:underline break-all">
                      {selectedCreator.email}
                    </a>
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
                  <p className="text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href={`tel:${selectedCreator.phone}`} className="text-primary hover:underline">
                      {selectedCreator.phone || '-'}
                    </a>
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground">พื้นที่ / จังหวัด</label>
                  <p className="text-foreground">
                    {[selectedCreator.baseLocation, selectedCreator.province].filter(Boolean).join(' / ') || '-'}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground mb-2">หมวดหมู่</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.categories && selectedCreator.categories.length > 0 ? (
                      selectedCreator.categories.map((category) => (
                        <div
                          key={category}
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 text-primary"
                        >
                          {category}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">ยังไม่มีข้อมูล</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground mb-2">ช่องทางโซเชียล</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedCreator.socialAccounts).map(([platform, url]) => {
                      return (
                        <div key={platform} className="flex items-center">
                          {platform} : <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                            {url}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground">วันที่ลงทะเบียน</label>
                  <p className="text-foreground">
                    {new Date(selectedCreator.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

