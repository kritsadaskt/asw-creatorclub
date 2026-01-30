import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile as CreatorProfileType } from '../../types';
import { getCreatorById, saveCreator } from '../../utils/storage';

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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CreatorProfileType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [creatorId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const creator = await getCreatorById(creatorId);
      if (creator) {
        setProfile(creator);
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2>โปรไฟล์ของฉัน</h2>
        <Button onClick={() => navigate('/affiliate')} variant="outline">
          สร้าง Affiliate Link
        </Button>
      </div>

      <div className="flex gap-5">
        <div className="w-1/4 bg-white rounded-xl shadow-sm border border-border p-6 space-y-6 flex flex-col justify-start items-center">
          <img
            src={profile.profileImage || ''}
            alt="Profile Image"
            className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border p-6 space-y-6 w-3/4">
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

            <div className="flex flex-col gap-1.5">
              <label>
                หมวดหมู่ <span className="text-destructive">*</span>
              </label>
              <select
                value={profile.category}
                onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                className="px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">เลือกหมวดหมู่</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <Input
              label="จำนวนผู้ติดตาม (รวมทุกช่องทาง)"
              type="number"
              value={profile.followers.toString()}
              onChange={(value) => setProfile({ ...profile, followers: parseInt(value) || 0 })}
              placeholder="กรอกจำนวนผู้ติดตาม"
              required
            />
          </div>

          {/* Social Accounts */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-primary">บัญชีโซเชียลมีเดีย</h3>
            
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
              label="Instagram"
              value={profile.socialAccounts.instagram || ''}
              onChange={(value) => setProfile({
                ...profile,
                socialAccounts: { ...profile.socialAccounts, instagram: value }
              })}
              placeholder="https://instagram.com/username"
            />

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
              label="YouTube"
              value={profile.socialAccounts.youtube || ''}
              onChange={(value) => setProfile({
                ...profile,
                socialAccounts: { ...profile.socialAccounts, youtube: value }
              })}
              placeholder="https://youtube.com/@username"
            />

            <Input
              label="Twitter (X)"
              value={profile.socialAccounts.twitter || ''}
              onChange={(value) => setProfile({
                ...profile,
                socialAccounts: { ...profile.socialAccounts, twitter: value }
              })}
              placeholder="https://twitter.com/username"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
