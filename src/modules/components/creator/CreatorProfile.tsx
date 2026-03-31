import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile as CreatorProfileType } from '../../types';
import { getCreatorById, saveCreator } from '../../utils/storage';
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
  const [profileImageError, setProfileImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'affiliate'>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

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

    try {
      setSaving(true);
      await saveCreator(profile);
      setIsEditing(false);
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
          {getProfileImageUrl(profile) && !profileImageError ? (
            <img
              src={getProfileImageUrl(profile)}
              alt="Profile Image"
              className="w-48 h-48 rounded-full object-cover border-4 border-primary/20"
              onError={() => setProfileImageError(true)}
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center text-primary text-4xl font-medium">
              {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}

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
                label="บัญชีโซเชียลมีเดีย"
                description=""
                onChange={(data) =>
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
                  })
                }
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
