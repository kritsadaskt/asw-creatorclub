import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile as CreatorProfileType } from '../../types';
import { getCreatorById, saveCreator } from '../../utils/storage';
import { getProfileImageUrl } from '../../utils/profileImage';
import { AffiliateGenerator } from './AffiliateGenerator';
import Select from 'react-select';

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
        if (!creator.category || creator.followers === 0) {
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

  if (loading || !profile) {
    return <div className="p-8 text-center">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-7 md:py-12">
      <div className="mb-6">
        <h2>โปรไฟล์ของฉัน</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border p-4 md:p-6 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 md:border-r border-border md:pr-6 flex md:flex-col items-center gap-6">
          {getProfileImageUrl(profile) && !profileImageError ? (
            <img
              src={getProfileImageUrl(profile)}
              alt="Profile Image"
              className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
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
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium ${
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
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium ${
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
                <h3 className="text-primary">ข้อมูลพื้นฐาน</h3>

                <Input
                  label="ชื่อ-นามสกุล"
                  value={profile.name}
                  onChange={(value) => setProfile({ ...profile, name: value })}
                  placeholder="กรอกชื่อ-นามสกุล"
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

                <div className="grid grid-cols-2 gap-7">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-primary">
                      หมวดหมู่ <span className="text-destructive">*</span>
                    </h3>
                    <Select
                      options={CATEGORIES.map((cat) => ({
                        value: cat,
                        label: cat,
                      }))}
                      value={
                        profile.category
                          ? { value: profile.category, label: profile.category }
                          : null
                      }
                      onChange={(selected) =>
                        setProfile({
                          ...profile,
                          category: selected ? (selected as { value: string }).value : '',
                        })
                      }
                      placeholder="เลือกหมวดหมู่"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>
              </div>

              {/* Social Accounts */}
              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-primary">บัญชีโซเชียลมีเดีย</h3>
                
                <div className="grid grid-cols-2 gap-7">
                  <Input
                    label="Facebook"
                    value={profile.socialAccounts.facebook || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      socialAccounts: { ...profile.socialAccounts, facebook: value }
                    })}
                    placeholder="https://facebook.com/username"
                  />
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={profile.followerCounts.facebook?.toString() || ''}
                    onChange={(value) => setProfile({ ...profile, followerCounts: { ...profile.followerCounts, facebook: parseInt(value) || 0 } })}
                    placeholder="กรอกจำนวนผู้ติดตาม"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-7">
                  <Input
                    label="Instagram"
                    value={profile.socialAccounts.instagram || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      socialAccounts: { ...profile.socialAccounts, instagram: value }
                    })}
                    placeholder="https://instagram.com/username"
                  />
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={profile.followerCounts.instagram?.toString() || ''}
                    onChange={(value) => setProfile({ ...profile, followerCounts: { ...profile.followerCounts, instagram: parseInt(value) || 0 } })}
                    placeholder="กรอกจำนวนผู้ติดตาม"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-7">
                  <Input
                    label="TikTok"
                    value={profile.socialAccounts.tiktok || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      socialAccounts: { ...profile.socialAccounts, tiktok: value }
                    })}
                    placeholder="https://tiktok.com/@username"
                  />
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={profile.followerCounts.tiktok?.toString() || ''}
                    onChange={(value) => setProfile({ ...profile, followerCounts: { ...profile.followerCounts, tiktok: parseInt(value) || 0 } })}
                    placeholder="กรอกจำนวนผู้ติดตาม"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-7">
                  <Input
                    label="YouTube"
                    value={profile.socialAccounts.youtube || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      socialAccounts: { ...profile.socialAccounts, youtube: value }
                    })}
                    placeholder="https://youtube.com/@username"
                  />
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={profile.followerCounts.youtube?.toString() || ''}
                    onChange={(value) => setProfile({ ...profile, followerCounts: { ...profile.followerCounts, youtube: parseInt(value) || 0 } })}
                    placeholder="กรอกจำนวนผู้ติดตาม"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-7">
                  <Input
                    label="Twitter (X)"
                    value={profile.socialAccounts.twitter || ''}
                    onChange={(value) => setProfile({
                      ...profile,
                      socialAccounts: { ...profile.socialAccounts, twitter: value }
                    })}
                    placeholder="https://twitter.com/username"
                  />
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={profile.followerCounts.twitter?.toString() || ''}
                    onChange={(value) => setProfile({ ...profile, followerCounts: { ...profile.followerCounts, twitter: parseInt(value) || 0 } })}
                    placeholder="กรอกจำนวนผู้ติดตาม"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} fullWidth disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </Button>
              </div>
            </>
          ) : (
            <AffiliateGenerator creatorId={creatorId} showBackButton={false} />
          )}
        </div>
      </div>
    </div>
  );
}
