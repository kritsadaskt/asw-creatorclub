'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, LayoutGrid, Loader2, Mail, Phone, Table, X } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube, FaXTwitter } from 'react-icons/fa6';
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
import { Lemon8Icon } from '@/modules/utils/svg';
import { CreatorBadge } from '../ui/creator-badge';
import { getProjectNameById } from '@/modules/utils/projectNameById';

const Select = dynamic(() => import('react-select').then((mod) => mod.default), {
  ssr: false,
}) as typeof import('react-select').default;

const CATEGORIES = ['ทั้งหมด', ...CREATOR_CATEGORIES.map((category) => category.label)];

const socialPlatformOptions: Array<{ value: 'all' | SocialPlatform; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'lemon8', label: 'Lemon8' },
];

const socialFollowerOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: '0-1k', label: '0 - 1,000' },
  { value: '1k-10k', label: '1,000 - 10,000' },
  { value: '10k-50k', label: '10,000 - 50,000' },
  { value: '50k-100k', label: '50,000 - 100,000' },
  { value: '100k-500k', label: '100,000 - 500,000' },
  { value: '500k+', label: '500,000+' },
];

const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));
const creatorTypeOptions: Array<{
  value: 'all' | 'asw_staff' | 'asw_household' | 'mi' | 'mut';
  label: string;
}> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'asw_staff', label: 'พนักงาน' },
  { value: 'asw_household', label: 'ลูกบ้าน' },
  { value: 'mi', label: 'Mister International' },
  { value: 'mut', label: 'Miss Universe Thailand' },
];

const ranges: { [key: string]: { min: number; max?: number } } = {
  '0-1k': { min: 0, max: 1000 },
  '1k-10k': { min: 1000, max: 10000 },
  '10k-50k': { min: 10000, max: 50000 },
  '50k-100k': { min: 50000, max: 100000 },
  '100k-500k': { min: 100000, max: 500000 },
  '500k+': { min: 500000 },
};

const PAGE_SIZE = 12;

type SocialPlatform = keyof CreatorProfile['socialAccounts'];

const SOCIAL_ICON_MAP: Record<SocialPlatform, ReactNode> = {
  facebook: <FaFacebook className="h-4 w-4 text-[#1877F2]" />,
  instagram: <FaInstagram className="h-4 w-4 text-pink-500" />,
  tiktok: <FaTiktok className="h-4 w-4 text-black" />,
  youtube: <FaYoutube className="h-4 w-4 text-red-600" />,
  twitter: <FaXTwitter className="h-4 w-4 text-black" />,
  lemon8: <Lemon8Icon className="h-4 w-4 text-yellow-500" />,
};

const socialList = (
  socialAccounts: CreatorProfile['socialAccounts'],
  followerCounts: CreatorProfile['followerCounts'],
) => (
  <div className="flex flex-wrap gap-2">
    {(Object.entries(socialAccounts) as Array<[SocialPlatform, string | undefined]>)
      .filter(([, url]) => Boolean(url))
      .map(([platform, url]) => {
        const followers = followerCounts?.[platform];
        const followerLabel =
          typeof followers === 'number' && Number.isFinite(followers)
            ? followers.toLocaleString()
            : 'ไม่ระบุ';
        return (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs hover:bg-muted/50"
          aria-label={platform}
          title={platform}
          onClick={(e) => e.stopPropagation()}
        >
          {SOCIAL_ICON_MAP[platform]}
          <span className="text-foreground">{followerLabel}</span>
        </a>
      )})}
  </div>
)

export function CreatorsDirectory() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedCreatorType, setSelectedCreatorType] = useState<
    'all' | 'asw_staff' | 'asw_household' | 'mi' | 'mut'
  >('all');
  const [socialPlatformFilter, setSocialPlatformFilter] = useState<'all' | SocialPlatform>('all');
  const [socialFollowerRange, setSocialFollowerRange] = useState('all');
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

    if (selectedCreatorType !== 'all') {
      rows = rows.filter((creator) => {
        const rawType = (creator.type ?? '').trim().toLowerCase();
        if (selectedCreatorType === 'asw_staff') {
          return rawType === 'assetwise_staff' || rawType === 'asw_staff';
        }
        if (selectedCreatorType === 'asw_household') {
          return rawType === 'asw_household' || rawType === 'asw_houshold';
        }
        return rawType === selectedCreatorType;
      });
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

    if (socialPlatformFilter !== 'all') {
      rows = rows.filter((creator) => {
        const socialUrl = creator.socialAccounts?.[socialPlatformFilter];
        if (!socialUrl) return false;

        if (socialFollowerRange === 'all') return true;
        const socialRange = ranges[socialFollowerRange];
        if (!socialRange) return true;

        const followers = creator.followerCounts?.[socialPlatformFilter];
        if (typeof followers !== 'number' || !Number.isFinite(followers)) return false;
        if (socialRange.max) {
          return followers >= socialRange.min && followers < socialRange.max;
        }
        return followers >= socialRange.min;
      });
    }

    return rows;
  }, [creators, selectedCategory, selectedCreatorType, searchQuery, socialPlatformFilter, socialFollowerRange]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, selectedCreatorType, socialPlatformFilter, socialFollowerRange]);

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

  const CreatorTypeBadge = ({ type }: { type: CreatorProfile['type'] }) => {
    switch (type?.toLowerCase()) {
      case 'assetwise_staff':
        return <CreatorBadge type="assetwise_staff" />;
      case 'asw_household':
        return <CreatorBadge type="assetwise_household" />;
      case 'mister_int':
        return <CreatorBadge type="mister_int" />;
      case 'miss_world':
        return <CreatorBadge type="miss_world" />;
      default:
        return null;
    }
  }

  const CreatorTypeLabel = ({ type }: { type: CreatorProfile['type'] }) => {
    switch (type?.toLowerCase()) {
      case 'assetwise_staff':
        return 'พนักงานแอสเซทไวส์';
      case 'asw_household':
        return 'ลูกบ้านแอสเซทไวส์';
      case 'mi':
        return 'Mister International';
      case 'mut':
        return 'Miss Universe Thailand';
      default:
        return 'บุคคลทั่วไป';
    }
  }

  const CreatorCard = ({ creator }: { creator: CreatorProfile }) => {
    const fullName = [creator.name, creator.lastName].filter(Boolean).join(' ');
    const socialCount = Object.values(creator.socialAccounts).filter(Boolean).length;
    const creatorType = (creator.type ?? '').trim().toLowerCase();
    const isAswStaff = creatorType === 'assetwise_staff' || creatorType === 'asw_staff';
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
          <CreatorTypeBadge type={creator.type} />
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
          <div className="col-span-2">
            {socialList(creator.socialAccounts, creator.followerCounts)}
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
          <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
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
              <label className="text-sm text-muted-foreground">ประเภท</label>
              <Select
                options={creatorTypeOptions}
                value={creatorTypeOptions.find((o) => o.value === selectedCreatorType)}
                onChange={(option) => {
                  setSelectedCreatorType((option?.value as typeof selectedCreatorType) ?? 'all');
                }}
                isClearable={false}
                classNamePrefix="react-select"
                placeholder="ทั้งหมด"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">ช่องทางโซเชียล</label>
              <Select
                options={socialPlatformOptions}
                value={socialPlatformOptions.find((o) => o.value === socialPlatformFilter)}
                onChange={(option) => {
                  const value = option?.value ?? 'all';
                  setSocialPlatformFilter(value);
                  if (value === 'all') {
                    setSocialFollowerRange('all');
                  }
                }}
                isClearable={false}
                classNamePrefix="react-select"
                placeholder="ทั้งหมด"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">ผู้ติดตามในช่องทางที่เลือก</label>
              <Select
                options={socialFollowerOptions}
                value={socialFollowerOptions.find((o) => o.value === socialFollowerRange)}
                onChange={(option) => {
                  setSocialFollowerRange(option?.value ?? 'all');
                }}
                isClearable={false}
                isDisabled={socialPlatformFilter === 'all'}
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
                Export {filteredCreators.length.toLocaleString()}
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
                  <label className="text-muted-foreground">ประเภท</label>
                  <p className="text-foreground">
                    {CreatorTypeLabel({ type: selectedCreator.type })}
                  </p>
                </div>

                {selectedCreator.type === 'asw_household' && (
                  <div>
                    <label className="text-muted-foreground">โครงการ</label>
                    <p className="text-foreground">
                      {selectedCreator.projectName ? getProjectNameById(selectedCreator.projectName) || selectedCreator.projectName : '-'}
                    </p>
                  </div>
                )}

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
                          className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
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
                  {socialList(selectedCreator.socialAccounts, selectedCreator.followerCounts)}
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

