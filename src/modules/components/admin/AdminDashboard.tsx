'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { CreatorProfile } from '../../types';
import { getCreators } from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import { getProfileImageUrl } from '../../utils/profileImage';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LayoutGrid, Loader2, MailIcon, MoreVertical, Table } from 'lucide-react';
import { FaPhone } from 'react-icons/fa6';
import { BASE_PATH } from '@/lib/publicPath';
import Select from 'react-select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';

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
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'inactive'>('all');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [minFollowers, setMinFollowers] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [followerRange, setFollowerRange] = useState('all');
  const [customFollowers, setCustomFollowers] = useState('');
  const [loading, setLoading] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState<CreatorProfile['id'] | null>(null);
  /** `${creatorId}:approval` | `${creatorId}:rejection` while that request is in flight */
  const [emailSendKey, setEmailSendKey] = useState<string | null>(null);

  const approvalOptions: Array<{
    value: typeof approvalFilter;
    label: string;
  }> = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'pending', label: 'คำขอเข้าร่วม (รอการอนุมัติ)' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'rejected', label: 'ถูกปฏิเสธ' },
    { value: 'inactive', label: 'ไม่ใช้งาน' },
  ];

  const categoryOptions = CATEGORIES.map((cat) => ({ value: cat, label: cat }));

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
    filterCreators();
  }, [creators, selectedCategory, searchQuery, followerRange, customFollowers, approvalFilter]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-action-dropdown="true"]')) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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

  const updateApprovalStatus = async (creator: CreatorProfile, status: 0 | 1 | 2 | 3) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: status })
        .eq('id', creator.id);

      if (error) {
        console.error('Update approval status error:', error);
        toast.error('ไม่สามารถอัปเดตสถานะได้');
        return;
      }

      toast.success('อัปเดตสถานะสำเร็จ');
      // Refresh list locally
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, approvalStatus: status } : c)),
      );
    } catch (error) {
      console.error('Update approval status error:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้');
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

  return (
    <div className="container mx-auto p-6">
      <h2 className="mb-6">แดชบอร์ดจัดการ Creators</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-6">
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
                    <span className="text-muted-foreground">ผู้ติดตาม:</span>
                    <span className="text-foreground">{creator.followers.toLocaleString()}</span>
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
                  >
                    ดูรายละเอียด
                  </Button>
                  {creator.approvalStatus === 3 && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateApprovalStatus(creator, 1)}
                        fullWidth
                        variant='success'
                      >
                        อนุมัติ
                      </Button>
                      <Button
                        onClick={() => updateApprovalStatus(creator, 0)}
                        fullWidth
                        variant='error'
                      >
                        ปฏิเสธ
                      </Button>
                    </div>
                  )}
                  {creator.approvalStatus === 1 && (
                    <Button
                      onClick={() => void sendApprovalEmail(creator)}
                      fullWidth
                      variant='successTransparent'
                      center
                      disabled={emailSendKey === `${creator.id}:approval`}
                    >
                      {emailSendKey === `${creator.id}:approval` ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <MailIcon className="w-5 h-5" />
                      )}
                      ส่งอีเมลแจ้งอนุมัติ
                    </Button>
                  )}
                  {creator.approvalStatus === 0 && (
                    <Button
                      onClick={() => void sendRejectionEmail(creator)}
                      fullWidth
                      variant='errorTransparent'
                      center
                      disabled={emailSendKey === `${creator.id}:rejection`}
                    >
                      {emailSendKey === `${creator.id}:rejection` ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <MailIcon className="w-5 h-5" />
                      )}
                      ส่งอีเมลแจ้งปฏิเสธ
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"></th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ชื่อ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">อีเมล</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">หมวดหมู่</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ผู้ติดตาม</th>
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
                    <td className="py-3 px-4 text-sm text-foreground">{creator.followers.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{creator.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm text-foreground">{getSocialLinks(creator).length} ช่องทาง</td>
                    <td className="py-3 px-4">
                      {approvalStatusBadge(creator)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative inline-block" data-action-dropdown="true">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId((prev) => (prev === creator.id ? null : creator.id))
                          }
                          className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground hover:bg-input-background"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {openActionMenuId === creator.id && (
                          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-white p-2 shadow-lg space-y-1">
                          <Button
                            onClick={() => {
                              setSelectedCreator(creator);
                              setOpenActionMenuId(null);
                            }}
                            variant='ghost'
                            size="sm"
                            fullWidth
                            rounded='none'
                          >
                            ดูรายละเอียด
                          </Button>
                          {creator.approvalStatus === 3 && (
                            <>
                              <Button
                                onClick={() => {
                                  void updateApprovalStatus(creator, 1);
                                  setOpenActionMenuId(null);
                                }}
                                size="sm"
                                fullWidth
                                variant='success'
                              >
                                อนุมัติ
                              </Button>
                              <Button
                                onClick={() => {
                                  void updateApprovalStatus(creator, 0);
                                  setOpenActionMenuId(null);
                                }}
                                variant='error'
                                size="sm"
                                fullWidth
                              >
                                ปฏิเสธ
                              </Button>
                            </>
                          )}
                          {creator.approvalStatus === 1 && (
                            <Button
                              onClick={() => {
                                void sendApprovalEmail(creator);
                                setOpenActionMenuId(null);
                              }}
                              size="sm"
                              fullWidth
                              variant='successTransparent'
                              center
                              disabled={emailSendKey === `${creator.id}:approval`}
                            >
                              {emailSendKey === `${creator.id}:approval` ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <MailIcon className="w-5 h-5" />
                              )}
                              ส่งอีเมลแจ้งอนุมัติ
                            </Button>
                          )}
                          {creator.approvalStatus === 0 && (
                            <Button
                              onClick={() => {
                                void sendRejectionEmail(creator);
                                setOpenActionMenuId(null);
                              }}
                              size="sm"
                              fullWidth
                              variant='errorTransparent'
                              center
                              disabled={emailSendKey === `${creator.id}:rejection`}
                            >
                              {emailSendKey === `${creator.id}:rejection` ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <MailIcon className="w-5 h-5" />
                              )}
                              ส่งอีเมลแจ้งปฏิเสธ
                            </Button>
                          )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        direction="right"
        open={!!selectedCreator}
        onOpenChange={(open) => {
          if (!open) setSelectedCreator(null);
        }}
      >
        <DrawerContent className="overflow-y-auto">
          {selectedCreator && (
            <>
              <DrawerHeader className="p-7">
                <DrawerTitle>รายละเอียด Creator</DrawerTitle>
                <DrawerDescription>ข้อมูลครีเอเตอร์สำหรับตรวจสอบและติดต่อ</DrawerDescription>
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
                      <span className="text-primary text-5xl">
                        {selectedCreator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-muted-foreground">ชื่อ-นามสกุล</label>
                  <p className="text-foreground">{selectedCreator.name}</p>
                </div>

                <div>
                  <label className="text-muted-foreground">อีเมล</label>
                  <p className="text-foreground">{selectedCreator.email}</p>
                </div>

                <div>
                  <label className="text-muted-foreground">เบอร์โทรศัพท์</label>
                  <p className="text-foreground">{selectedCreator.phone}</p>
                </div>

                <div>
                  <label className="text-muted-foreground">หมวดหมู่</label>
                  <p className="text-foreground">
                    {selectedCreator.categories && selectedCreator.categories.length > 1
                      ? selectedCreator.categories.join(', ')
                      : '-'}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground">บัญชีโซเชียลมีเดีย</label>
                  <div className="mt-2 space-y-2">
                    {getSocialLinks(selectedCreator).map((social, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground w-24">{social.name}:</span>
                        <a
                          href={`https://${social.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all"
                        >
                          {social.url}
                        </a>
                      </div>
                    ))}
                    {getSocialLinks(selectedCreator).length === 0 && (
                      <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground">วันที่ลงทะเบียน</label>
                  <p className="text-foreground">
                    {new Date(selectedCreator.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <DrawerFooter>
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
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
