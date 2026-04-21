import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile as CreatorProfileType } from '../../types';
import {
  CREATOR_PROFILE_UPDATED_EVENT,
  getCreatorById,
  saveCreator,
  uploadCreatorProfileImage,
} from '../../utils/storage';
import { getProfileImageUrl } from '../../utils/profileImage';
import { AffiliateGenerator } from './AffiliateGenerator';
import { GetLinkCard } from './GetLinkCard';
import { supabase } from '../../utils/supabase';
import { hashPassword, validatePassword, validatePasswordConfirm } from '../../utils/password';
import Select from 'react-select';
import SocialAccounts from '../layout/SocialAccounts';

interface CreatorProfileProps {
  creatorId: string;
}

const CATEGORIES = [
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

export function CreatorProfile({ creatorId }: CreatorProfileProps) {
  const [profile, setProfile] = useState<CreatorProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSocialSubmitErrors, setShowSocialSubmitErrors] = useState(false);
  const socialFormValidRef = useRef(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'affiliate'>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, [creatorId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const creator = await getCreatorById(creatorId);
      if (creator) {
        setProfile(creator);
        setProfileImageError(false);
        // Auto-enable editing if profile is incomplete
        if (!creator.categories || creator.categories.length === 0 || creator.followers === 0) {
          setIsEditing(true);
        }
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
        <h2 className='text-neutral-800 text-3xl font-medium'>CREATOR PROFILE</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-border px-4 py-6 md:px-10 md:py-12 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 md:border-r border-border md:pr-6 flex md:flex-col items-center gap-6">
          <div className="relative group w-48 h-48 shrink-0 rounded-full border-4 border-primary/20 overflow-hidden">
            {getProfileImageUrl(profile) && !profileImageError ? (
              <img
                src={getProfileImageUrl(profile)}
                alt="Profile Image"
                className="h-full w-full object-cover"
                onError={() => setProfileImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary text-4xl font-medium">
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
              disabled={imageUploading}
              onClick={() => profileImageInputRef.current?.click()}
              aria-label={imageUploading ? 'กำลังอัปโหลดรูปโปรไฟล์' : 'เปลี่ยนรูปโปรไฟล์'}
              className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-full px-3 text-center text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 border border-white/25 bg-black/35 backdrop-blur-md hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                imageUploading
                  ? 'opacity-100 cursor-wait'
                  : 'cursor-pointer max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
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
          </nav>
          <small className="text-muted-foreground text-sm">version : {process.env.NEXT_PUBLIC_APP_VERSION}</small>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' ? (
            <>
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-primary font-bold">ข้อมูลพื้นฐาน</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                  <Input
                    label="ชื่อ"
                    value={profile.name}
                    onChange={(value) => setProfile({ ...profile, name: value })}
                    placeholder="กรอกชื่อ"
                    required
                  />

                  <Input
                    label="นามสกุล"
                    value={profile.lastName || ''}
                    onChange={(value) => setProfile({ ...profile, lastName: value || undefined })}
                    placeholder="กรอกนามสกุล"
                    required
                  />

                <Input
                  label="อีเมล"
                  type="email"
                  value={profile.email}
                  onChange={(value) => setProfile({ ...profile, email: value })}
                  placeholder="กรอกอีเมล"
                  required
                />

                <Input
                  label="เบอร์โทรศัพท์"
                  type="tel"
                  value={profile.phone}
                  onChange={(value) => setProfile({ ...profile, phone: value })}
                  placeholder="กรอกเบอร์โทรศัพท์"
                  required
                />
                </div>

                {profile.province && (
                  <Input
                    label="จังหวัดที่อยู่อาศัย"
                    value={profile.province}
                    onChange={(value) => setProfile({ ...profile, province: value || undefined })}
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
                      options={CATEGORIES.map((cat) => ({
                        value: cat,
                        label: cat,
                      }))}
                    isMulti
                    value={(profile.categories || []).map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                    onChange={(selected) =>
                      setProfile({
                        ...profile,
                        categories: (selected || []).map(
                          (opt: unknown) => (opt as { value: string }).value,
                        ),
                      })
                    }
                      placeholder="เลือกหมวดหมู่"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              </div>

              <SocialAccounts
                initialSocialAccounts={profile.socialAccounts}
                initialFollowerCounts={profile.followerCounts}
                requireAtLeastOne={false}
                showErrors={showSocialSubmitErrors}
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
                      placeholder="กรอกรหัสผ่านใหม่"
                    />
                    <Input
                      label="ยืนยันรหัสผ่านใหม่"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleSetPassword}
                      disabled={passwordSaving || !newPassword || !confirmPassword}
                    >
                      {passwordSaving ? 'กำลังตั้งรหัสผ่าน...' : 'ตั้งรหัสผ่าน'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} fullWidth disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {profile.approvalStatus === 1 && (
                <GetLinkCard creatorId={profile.id} />
              )}
              <AffiliateGenerator creatorId={creatorId} showBackButton={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
