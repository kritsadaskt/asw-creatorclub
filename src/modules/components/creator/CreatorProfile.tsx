import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  CalendarCheck,
  Camera,
  ClipboardList,
  Handshake,
  Link2,
  Loader2,
  MousePointerClick,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile as CreatorProfileType } from '../../types';
import {
  CREATOR_PROFILE_UPDATED_EVENT,
  getAffiliateLinksByCreator,
  getCreatorById,
  saveCreator,
  uploadCreatorProfileImage,
} from '../../utils/storage';
import { BASE_PATH } from '@/lib/publicPath';
import { formatStatsSyncedAtBangkok } from '@/lib/format-stats-synced-at';
import {
  affiliateFunnelStageHasNoData,
  formatAffiliateFunnelStageValue,
} from '@/lib/affiliate-funnel-format';
import { getProfileImageUrl } from '../../utils/profileImage';
import { AffiliateGenerator } from './AffiliateGenerator';
import { supabase } from '../../utils/supabase';
import { hashPassword, validatePassword, validatePasswordConfirm } from '../../utils/password';
import Select from 'react-select';
import SocialAccounts from '../layout/SocialAccounts';
import { cn } from '../ui/utils';
import { FaArrowLeft, FaCopy, FaEdit, FaSave, FaUndo } from 'react-icons/fa';

interface CreatorProfileProps {
  creatorId: string;
}

type ShlinkStatEntry = { total: number; nonBots?: number } | null;

type CategorySelectOption = { value: string; label: string };

export function CreatorProfile({ creatorId }: CreatorProfileProps) {
  const [profile, setProfile] = useState<CreatorProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSocialSubmitErrors, setShowSocialSubmitErrors] = useState(false);
  const socialFormValidRef = useRef(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'affiliate'>('affiliate');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategorySelectOption[]>([]);
  const [affiliateStatsLoading, setAffiliateStatsLoading] = useState(false);
  const [affiliateLinkCount, setAffiliateLinkCount] = useState(0);
  const [affiliateTotalClicks, setAffiliateTotalClicks] = useState(0);
  const [affiliateStatsSyncedAt, setAffiliateStatsSyncedAt] = useState<string | null>(null);
  const [affiliateRegistrations, setAffiliateRegistrations] = useState<number | null>(null);
  const [affiliateBookings] = useState(0);
  const [affiliateTransfers] = useState(0);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const formatProfileStatValue = (
    value: number | null,
    available: boolean,
    key?: 'bookings' | 'transfers',
  ) =>
    formatAffiliateFunnelStageValue({
      key,
      value,
      available,
    });

  const profileStatNoData = (value: number | null, available: boolean) =>
    affiliateFunnelStageHasNoData({ value, available });

  useEffect(() => {
    loadProfile();
  }, [creatorId]);

  useEffect(() => {
    const loadCategoryOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('creator_categories')
          .select('id,th_label,en_label')
          .eq('is_active', true)
          .order('id', { ascending: true });

        if (error) {
          throw error;
        }

        const nextOptions = (data || [])
          .map((row) => {
            const label = (row.th_label || row.en_label || '').trim();
            return label ? { value: String(row.id), label } : null;
          })
          .filter((opt): opt is CategorySelectOption => opt !== null);
        setCategoryOptions(nextOptions);
      } catch (error) {
        console.error('Error loading category options:', error);
      }
    };

    void loadCategoryOptions();
  }, []);

  useEffect(() => {
    if (activeTab !== 'affiliate') return;

    let cancelled = false;

    const loadAffiliateStats = async () => {
      try {
        setAffiliateStatsLoading(true);
        const links = await getAffiliateLinksByCreator(creatorId);
        if (cancelled) return;

        setAffiliateLinkCount(links.length);

        const res = await fetch(`${BASE_PATH}/api/affiliate/shlink-stats`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (!cancelled) {
            setAffiliateTotalClicks(0);
            setAffiliateStatsSyncedAt(null);
          }
          return;
        }

        const data = (await res.json()) as {
          stats?: Record<string, ShlinkStatEntry>;
          statsSyncedAt?: string | null;
        };

        const statsByLinkId = data.stats ?? {};
        const totalClicks = links.reduce((sum, link) => {
          const total = statsByLinkId[link.id]?.total ?? 0;
          return sum + (Number.isFinite(total) ? total : 0);
        }, 0);

        if (!cancelled) {
          setAffiliateTotalClicks(totalClicks);
          setAffiliateStatsSyncedAt(typeof data.statsSyncedAt === 'string' ? data.statsSyncedAt : null);
        }

        const leadRes = await fetch(`${BASE_PATH}/api/affiliate/creator-lead-stats`, {
          credentials: 'include',
        });
        if (!cancelled && leadRes.ok) {
          const leadData = (await leadRes.json()) as {
            registrations?: number | null;
          };
          setAffiliateRegistrations(
            typeof leadData.registrations === 'number' ? leadData.registrations : null,
          );
        } else if (!cancelled) {
          setAffiliateRegistrations(null);
        }
      } catch (error) {
        console.error('Error loading affiliate stats:', error);
        if (!cancelled) {
          setAffiliateLinkCount(0);
          setAffiliateTotalClicks(0);
          setAffiliateStatsSyncedAt(null);
          setAffiliateRegistrations(null);
        }
      } finally {
        if (!cancelled) setAffiliateStatsLoading(false);
      }
    };

    void loadAffiliateStats();

    return () => {
      cancelled = true;
    };
  }, [activeTab, creatorId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const creator = await getCreatorById(creatorId);
      if (creator) {
        setProfile(creator);
        setProfileImageError(false);
      } else {
        toast.error('ไม่พบข้อมูลโปรไฟล์');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!socialFormValidRef.current) {
      setShowSocialSubmitErrors(true);
      toast.error('กรุณาตรวจสอบลิงก์โซเชียลมีเดีย');
      return;
    }

    try {
      setSaving(true);
      await saveCreator(profile);
      setIsEditing(false);
      setShowSocialSubmitErrors(false);
      toast.success('บันทึกข้อมูลสำเร็จ!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!profile) return;

    const { isValid, error } = validatePassword(newPassword);
    if (!isValid) {
      toast.error(error || 'รหัสผ่านไม่ถูกต้อง');
      return;
    }

    const confirm = validatePasswordConfirm(newPassword, confirmPassword);
    if (!confirm.isValid) {
      toast.error(confirm.error || 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setPasswordSaving(true);
      const passwordHash = await hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Error setting password:', updateError);
        toast.error('ไม่สามารถตั้งรหัสผ่านได้');
        return;
      }

      setProfile({ ...profile, passwordHash });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('ตั้งรหัสผ่านสำเร็จ! คุณสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านได้แล้ว');
    } catch (err) {
      console.error('Error setting password:', err);
      toast.error('ไม่สามารถตั้งรหัสผ่านได้');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleProfileImageFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile) return;

    try {
      setImageUploading(true);
      const publicUrl = await uploadCreatorProfileImage(file, profile.id);
      const updated = { ...profile, profileImage: publicUrl };
      setProfile(updated);
      setProfileImageError(false);
      await saveCreator(updated);
      toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
      window.dispatchEvent(new CustomEvent(CREATOR_PROFILE_UPDATED_EVENT));
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'CREATOR_PROFILE_IMAGE_TOO_LARGE') {
        toast.error('ไฟล์รูปใหญ่เกินไป (สูงสุด 5 MB)');
      } else if (message === 'CREATOR_PROFILE_IMAGE_INVALID_TYPE') {
        toast.error('รองรับเฉพาะไฟล์รูป JPEG, PNG, WebP หรือ GIF');
      } else {
        console.error('Error uploading profile image:', err);
        toast.error('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setImageUploading(false);
    }
  };

  if (loading || !profile) {
    return <div className="p-8 text-center">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-7 md:py-12">
      <div className="mb-6">
        <h2 className='text-neutral-800 md:text-3xl text-2xl font-medium mb-1'>
          {profile.name} {profile.lastName}
        </h2>
        <small className="text-muted-foreground text-sm flex items-center gap-2">Creator ID : <span className="font-normal text-primary">{creatorId.slice(0, 8)}...{creatorId.slice(-4)}</span> <FaCopy className="w-3 h-3 cursor-pointer" onClick={() => navigator.clipboard.writeText(creatorId)} /></small>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border px-4 py-6 md:px-10 md:py-12 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 md:border-r border-border md:pr-6 flex flex-col items-center gap-6">
          <div className="relative group w-48 h-48 shrink-0 rounded-full border-4 border-primary/20 overflow-hidden">
            {getProfileImageUrl(profile) && !profileImageError ? (
              <img
                src={getProfileImageUrl(profile)}
                alt="Profile Image"
                className={`h-full w-full object-cover transition-all duration-200 ${
                  isEditing ? 'group-hover:blur-[2px] group-hover:brightness-75' : ''
                }`}
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-primary/10 text-primary text-4xl font-medium transition-all duration-200 ${
                  isEditing ? 'group-hover:blur-[2px] group-hover:brightness-75' : ''
                }`}
              >
                {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}

            <input
              ref={profileImageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-label="เลือกรูปโปรไฟล์"
              tabIndex={-1}
              onChange={handleProfileImageFileChange}
            />
            <button
              type="button"
              disabled={imageUploading || !isEditing}
              onClick={() => {
                if (!isEditing) return;
                profileImageInputRef.current?.click();
              }}
              aria-label={imageUploading ? 'กำลังอัปโหลดรูปโปรไฟล์' : 'เปลี่ยนรูปโปรไฟล์'}
              className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-full px-3 text-center text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 border border-white/25 bg-black/35 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                imageUploading
                  ? 'opacity-100 cursor-wait'
                  : !isEditing
                    ? 'opacity-0 pointer-events-none'
                    : 'cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
              }`}
            >
              {imageUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin opacity-95" aria-hidden />
                  <span className="leading-tight drop-shadow-sm">กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Camera className="h-6 w-6 opacity-95 drop-shadow-sm" aria-hidden />
                  <span className="leading-tight drop-shadow-sm">เปลี่ยนรูปโปรไฟล์</span>
                </>
              )}
            </button>
          </div>

          <nav className="w-full space-y-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-primary/5 text-primary'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors'
              }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('affiliate')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium cursor-pointer ${
                activeTab === 'affiliate'
                  ? 'bg-primary/5 text-primary'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors'
              }`}
            >
              Affiliate
            </button>
            <a href='/creatorclub/' className='w-full text-left px-4 py-2.5 rounded-lg font-medium cursor-pointer flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors'>
              <FaArrowLeft className="w-4 h-4" />
              กลับไปหน้าหลัก
            </a>
          </nav>

          <p className="text-muted-foreground text-sm">ช่องทางติดต่อ</p>
          <div className="grid grid-cols-2 gap-2">
            <a href='https://lin.ee/ukTO0FG' target='_blank' className='w-full text-left p-2 text-xs rounded font-medium cursor-pointer bg-green-600 md:hover:bg-green-700 text-white flex items-center justify-center'>
              Line OA
            </a>
            <a href='https://line.me/ti/g2/5x4meOiM_5Ye8rHJlKs3flrchJ6-Bm1AuT9myg?utm_source=invitation&utm_medium=link_copy&utm_campaign=default' target='_blank' className='w-full text-left p-2 text-xs rounded font-medium cursor-pointer bg-green-600 md:hover:bg-green-700 text-white flex items-center justify-center'>
              Open Chat
            </a>
          </div>
          <small className="text-muted-foreground text-xs">
            <span className='text-destructive'>*</span>เข้า Open Chat ครั้งแรก ใช้รหัส <span className="font-bold">ASW2026</span></small>

          <hr className="my-2 border-border w-full" />

          <small className="text-muted-foreground text-sm">version : {process.env.NEXT_PUBLIC_APP_VERSION}</small>  
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' ? (
            <>
              {/* Basic Info */}
              <div className="flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <button className='flex cursor-pointer items-center gap-2 bg-transparent border-2 border-red-500 hover:bg-red-500 hover:text-white text-red-500 px-4 py-2 rounded-lg' onClick={() => setIsEditing(false)}>
                      <FaUndo className="w-4 h-4" />
                      ยกเลิก
                    </button>
                    <button className='flex cursor-pointer items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg' onClick={handleSave} disabled={saving}>
                      <FaSave className="w-4 h-4" />
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </>
                ) : (
                  <button className='flex cursor-pointer items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg' onClick={() => setIsEditing(true)}>
                    <FaEdit className="w-4 h-4" />
                    แก้ไข
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-primary font-bold">ข้อมูลพื้นฐาน</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  <Input
                    label="ชื่อ"
                    value={profile.name}
                    onChange={(value) => setProfile({ ...profile, name: value })}
                    disabled={!isEditing}
                    placeholder="กรอกชื่อ"
                    required
                  />

                  <Input
                    label="นามสกุล"
                    value={profile.lastName || ''}
                    onChange={(value) => setProfile({ ...profile, lastName: value || undefined })}
                    disabled={!isEditing}
                    placeholder="กรอกนามสกุล"
                    required
                  />

                <Input
                  label="อีเมล"
                  type="email"
                  value={profile.email}
                  onChange={(value) => setProfile({ ...profile, email: value })}
                  disabled={!isEditing}
                  placeholder="กรอกอีเมล"
                  required
                />

                <Input
                  label="เบอร์โทรศัพท์"
                  type="tel"
                  value={profile.phone}
                  onChange={(value) => setProfile({ ...profile, phone: value })}
                  disabled={!isEditing}
                  placeholder="กรอกเบอร์โทรศัพท์"
                  required
                />

                <Input
                  label="วันเกิด"
                  type="date"
                  value={profile.dob || ''}
                  onChange={(value) => setProfile({ ...profile, dob: value || undefined })}
                  disabled={!isEditing}
                  placeholder="เลือกวันเกิด"
                />
                </div>

                {profile.province && (
                  <Input
                    label="จังหวัดที่อยู่อาศัย"
                    value={profile.province}
                    onChange={(value) => setProfile({ ...profile, province: value || undefined })}
                    disabled={!isEditing}
                    placeholder="กรอกจังหวัดที่อยู่อาศัย"
                    required
                  />
                )}
                <div className="h-5"></div>
                <div className="grid grid-cols-2 gap-7">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-primary">
                      คุณเป็นครีเอเตอร์สายไหน ? <span className="text-destructive">*</span>
                    </h3>
                    <Select
                      options={categoryOptions}
                    isMulti
                    value={categoryOptions.filter((opt) =>
                      (profile.categoryIds || []).includes(opt.value),
                    )}
                    onChange={(selected) =>
                      setProfile({
                        ...profile,
                        categoryIds: (selected || []).map(
                          (opt: unknown) => (opt as { value: string }).value,
                        ),
                      })
                    }
                      placeholder="เลือกหมวดหมู่"
                      classNamePrefix="react-select"
                      isDisabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <SocialAccounts
                initialSocialAccounts={profile.socialAccounts}
                initialFollowerCounts={profile.followerCounts}
                requireAtLeastOne={false}
                showErrors={showSocialSubmitErrors}
                disabled={!isEditing}
                label="บัญชีโซเชียลมีเดีย"
                description=""
                onChange={(data) => {
                  socialFormValidRef.current = data.isValid;
                  setProfile({
                    ...profile,
                    socialAccounts: {
                      ...profile.socialAccounts,
                      ...data.socialAccounts,
                    },
                    followerCounts: {
                      ...profile.followerCounts,
                      ...data.followerCounts,
                    },
                  });
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                <Input
                  label="Budget เฉลี่ยต่อโพสต์"
                  type="number"
                  min={0}
                  value={profile.budget != null ? String(profile.budget) : ''}
                  onChange={(value) => {
                    const next = value.trim();
                    if (!next) {
                      setProfile({ ...profile, budget: undefined });
                      return;
                    }
                    const parsed = Number(next);
                    setProfile({
                      ...profile,
                      budget: Number.isFinite(parsed) ? parsed : undefined,
                    });
                  }}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>

              {/* Password section for Facebook-only accounts */}
              {profile.facebookId && !profile.passwordHash && (
                <div className="mt-6 space-y-3 border-t border-border pt-6">
                  <h3 className="text-primary font-bold">ตั้งรหัสผ่านสำหรับเข้าสู่ระบบด้วยอีเมล</h3>
                  <p className="text-sm text-muted-foreground">
                    บัญชีของคุณถูกสร้างด้วย Facebook คุณสามารถตั้งรหัสผ่านเพื่อเข้าสู่ระบบด้วยอีเมลและใช้ฟีเจอร์กู้คืนรหัสผ่านได้
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="รหัสผ่านใหม่"
                      type="password"
                      value={newPassword}
                      onChange={setNewPassword}
                      disabled={!isEditing}
                      placeholder="กรอกรหัสผ่านใหม่"
                    />
                    <Input
                      label="ยืนยันรหัสผ่านใหม่"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      disabled={!isEditing}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={!isEditing || passwordSaving || !newPassword || !confirmPassword}
                    >
                      {passwordSaving ? 'กำลังตั้งรหัสผ่าน...' : 'ตั้งรหัสผ่าน'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    {
                      key: 'links',
                      label: 'Link ทั้งหมด',
                      icon: Link2,
                      loading: affiliateStatsLoading,
                      value: affiliateLinkCount,
                      available: true,
                    },
                    {
                      key: 'clicks',
                      label: 'คลิกทั้งหมด',
                      icon: MousePointerClick,
                      loading: affiliateStatsLoading,
                      value: affiliateTotalClicks,
                      available: true,
                    },
                    {
                      key: 'registrations',
                      label: 'ลงทะเบียน',
                      icon: ClipboardList,
                      loading: affiliateStatsLoading,
                      value: affiliateRegistrations,
                      available: affiliateRegistrations !== null,
                    },
                    {
                      key: 'bookings',
                      label: 'จอง',
                      icon: CalendarCheck,
                      loading: affiliateStatsLoading,
                      value: affiliateBookings,
                      available: true,
                    },
                    {
                      key: 'transfers',
                      label: 'โอน',
                      icon: Handshake,
                      loading: affiliateStatsLoading,
                      value: affiliateTransfers,
                      available: true,
                    },
                  ] as const
                ).map((stat) => {
                  const Icon = stat.icon;
                  const noData = !stat.loading && profileStatNoData(stat.value, stat.available);
                  return (
                    <div
                      key={stat.key}
                      className={cn(
                        'rounded-xl border border-border p-4 shadow-sm sm:p-5',
                        noData ? 'bg-neutral-100' : 'bg-white',
                      )}
                    >
                      <div
                        className={cn(
                          'mb-2 flex items-center gap-2',
                          noData ? 'text-neutral-500' : 'text-muted-foreground',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', noData ? 'text-neutral-400' : 'text-primary')} />
                        <span className="text-sm">{stat.label}</span>
                      </div>
                      <p
                        className={cn(
                          'text-2xl font-semibold tabular-nums',
                          noData ? 'text-neutral-400' : 'text-foreground',
                        )}
                      >
                        {stat.loading
                          ? '...'
                          : formatProfileStatValue(
                              stat.value,
                              stat.available,
                              stat.key === 'bookings' || stat.key === 'transfers'
                                ? stat.key
                                : undefined,
                            )}
                      </p>
                    </div>
                  );
                })}
              </div>
              {formatStatsSyncedAtBangkok(affiliateStatsSyncedAt) && (
                <p className="text-xs text-muted-foreground">
                  ตัวเลขคลิก sync ล่าสุด: {formatStatsSyncedAtBangkok(affiliateStatsSyncedAt)} (เวลาไทย)
                </p>
              )}
              <AffiliateGenerator creatorId={creatorId} showBackButton={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
