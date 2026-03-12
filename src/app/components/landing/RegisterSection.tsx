import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile } from '../../types';
import { saveCreator, getCreatorByEmail, getCreatorByFacebookId, setCurrentUser, generateUUID } from '../../utils/storage';
import { loginWithFacebook, getFacebookUserInfo, fetchAndUploadFacebookProfileImage } from '../../utils/facebook';
import { hashPassword, validatePassword, validatePasswordConfirm } from '../../utils/password';
import { UserPlus } from 'lucide-react';
import { Dropdown } from 'react-day-picker';
import Select from 'react-select';

interface RegisterSectionProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

const BANGKOK_PROVINCES = [
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
  'นครปฐม'
];

export function RegisterSection({ onLogin }: RegisterSectionProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [province, setProvince] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  
  // Social media fields
  const [facebookUrl, setFacebookUrl] = useState('');
  const [facebookFollowers, setFacebookFollowers] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [instagramFollowers, setInstagramFollowers] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [tiktokFollowers, setTiktokFollowers] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeFollowers, setYoutubeFollowers] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [twitterFollowers, setTwitterFollowers] = useState('');
  
  // Budget fields
  const [budget, setBudget] = useState('');

  // Creator Category
  const [creatorCategory, setCreatorCategory] = useState<{ value: string; label: string }[]>([]);
  const CREATOR_CATEGORIES = [
    { value: 'personal_blog', label: 'Personal Blog' },
    { value: 'travel', label: 'Travel Blog' },
    { value: 'pet', label: 'Pet' },
    { value: 'food', label: 'Food' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'health', label: 'Health' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'technology', label: 'Technology' },
    { value: 'science', label: 'Science' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'news', label: 'News' },
    { value: 'sports', label: 'Sports' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'music', label: 'Music' },
    { value: 'art', label: 'Art' },
    { value: 'design', label: 'Design' },
    { value: 'architecture', label: 'Architecture' },
    { value: 'other', label: 'Other' },
  ];


  const PARTNERS_TYPE = [
    { value: 'MUT', label: 'MUT' },
    { value: 'MI_THAILAND', label: 'MI Thailand' },
    { value: 'MISS_THAILAND', label: 'นางสาวไทย' },
    { value: 'MISTER_AND_MISS_GLOBAL_THAILAND', label: 'Mister and Miss Global Thailand' },
    { value: 'MISS_WORLD', label: 'Miss World' },
    { value: 'other', label: 'Other' },
  ];

  // Status fields
  const [status, setStatus] = useState<'general' | 'resident' | 'partner'>('general');
  const [projectName, setProjectName] = useState('');
  const [partnerType, setPartnerType] = useState<'MUT' | 'MIT' | 'other'>('MUT');
  const handleFacebookRegister = async () => {
    setError('');
    setFacebookLoading(true);

    try {
      // Login with Facebook and keep auth response for token (to fetch profile image)
      const loginResponse = await loginWithFacebook();
      const fbUser = await getFacebookUserInfo();
      const accessToken = loginResponse.authResponse?.accessToken;

      // Check if user already exists
      let existingCreator = await getCreatorByFacebookId(fbUser.id);
      if (!existingCreator && fbUser.email) {
        existingCreator = await getCreatorByEmail(fbUser.email);
      }

      if (existingCreator) {
        // User already registered, just log them in
        setCurrentUser(existingCreator.id, 'creator');
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับกลับ ${existingCreator.name}`,
        });
        onLogin(existingCreator.id, 'creator');
        return;
      }

      // Pre-fill form with Facebook data
      if (fbUser.name) setName(fbUser.name);
      if (fbUser.email) setEmail(fbUser.email);

      // Create new Creator profile with Facebook info
      // For now, just show success and let them fill the rest of the form
      toast.info('ข้อมูลจาก Facebook ถูกกรอกแล้ว', {
        description: 'กรุณากรอกข้อมูลที่เหลือและกดลงทะเบียน',
      });

      // Store Facebook ID temporarily to use when submitting
      sessionStorage.setItem('pendingFacebookId', fbUser.id);
      // Re-host profile image to our storage so it doesn't 404 (Facebook blocks direct <img> use)
      let pictureUrl: string | null = null;
      if (accessToken) {
        pictureUrl = await fetchAndUploadFacebookProfileImage(accessToken, fbUser.id);
      }
      sessionStorage.setItem(
        'pendingFacebookPicture',
        pictureUrl || `https://graph.facebook.com/${fbUser.id}/picture?type=large`
      );
    } catch (err) {
      console.error('Facebook registration error:', err);
      if (err instanceof Error && err.message.includes('cancelled')) {
        // User cancelled, don't show error
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ Facebook');
        toast.error('เกิดข้อผิดพลาด');
      }
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check for pending Facebook registration
      const pendingFacebookId = sessionStorage.getItem('pendingFacebookId');
      const pendingFacebookPicture = sessionStorage.getItem('pendingFacebookPicture');

      // Validate email
      const existingCreator = await getCreatorByEmail(email);
      if (existingCreator) {
        setError('อีเมลนี้ถูกใช้งานแล้ว');
        setLoading(false);
        return;
      }

      // Validate password (only if not using Facebook)
      if (!pendingFacebookId) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.error || 'รหัสผ่านไม่ถูกต้อง');
          setLoading(false);
          return;
        }

        const confirmValidation = validatePasswordConfirm(password, confirmPassword);
        if (!confirmValidation.isValid) {
          setError(confirmValidation.error || 'รหัสผ่านไม่ตรงกัน');
          setLoading(false);
          return;
        }
      }

      // Validate location
      if (!baseLocation) {
        setError('กรุณาเลือกจังหวัดที่คุณอยู่ปัจจุบัน');
        setLoading(false);
        return;
      }

      if (baseLocation === 'ต่างจังหวัด' && !province.trim()) {
        setError('กรุณากรอกจังหวัดของคุณ');
        setLoading(false);
        return;
      }

      // Validate at least one social media
      if (!facebookUrl && !instagramUrl && !tiktokUrl && !youtubeUrl && !twitterUrl) {
        setError('กรุณากรอกข้อมูล Social Media อย่างน้อย 1 แพลตฟอร์ม');
        setLoading(false);
        return;
      }

      // Validate project name for residents
      if (status === 'resident' && !projectName.trim()) {
        setError('กรุณากรอกชื่อโครงการ');
        setLoading(false);
        return;
      }

      // Hash password if provided
      let passwordHash: string | undefined;
      if (!pendingFacebookId && password) {
        passwordHash = await hashPassword(password);
      }

      const newCreator: CreatorProfile = {
        id: generateUUID(),
        email,
        name,
        phone,
        baseLocation,
        province: baseLocation === 'ต่างจังหวัด' ? province : undefined,
        category: '',
        followers: 0,
        profileImage: pendingFacebookPicture || undefined,
        socialAccounts: {
          facebook: facebookUrl || undefined,
          instagram: instagramUrl || undefined,
          tiktok: tiktokUrl || undefined,
          youtube: youtubeUrl || undefined,
          twitter: twitterUrl || undefined,
        },
        followerCounts: {
          facebook: facebookFollowers ? parseInt(facebookFollowers) : undefined,
          instagram: instagramFollowers ? parseInt(instagramFollowers) : undefined,
          tiktok: tiktokFollowers ? parseInt(tiktokFollowers) : undefined,
          youtube: youtubeFollowers ? parseInt(youtubeFollowers) : undefined,
          twitter: twitterFollowers ? parseInt(twitterFollowers) : undefined,
        },
        budgets: {
          facebook: budget ? parseInt(budget) : undefined,
        },
        status,
        projectName: status === 'resident' ? projectName : undefined,
        createdAt: new Date().toISOString(),
        facebookId: pendingFacebookId || undefined,
        passwordHash,
      };

      await saveCreator(newCreator);
      
      // Clear pending Facebook data
      sessionStorage.removeItem('pendingFacebookId');
      sessionStorage.removeItem('pendingFacebookPicture');
      
      setCurrentUser(newCreator.id, 'creator');
      toast.success('ลงทะเบียนสำเร็จ!', {
        description: 'ยินดีต้อนรับเข้าสู่ AssetWise Creators Club'
      });
      onLogin(newCreator.id, 'creator');
    } catch (err) {
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Check if Facebook data is pending
  const hasPendingFacebook = typeof window !== 'undefined' && sessionStorage.getItem('pendingFacebookId');

  return (
    <section id="register-section" className="py-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-black mb-2">เข้าร่วมกับเรา</h2>
            <p className="text-muted-foreground">
              สร้างโปรไฟล์และเริ่มต้นเส้นทางสู่ความสำเร็จในวันนี้
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Facebook Register Button */}
          <button
            type="button"
            onClick={handleFacebookRegister}
            disabled={facebookLoading}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {facebookLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนด้วย Facebook'}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-muted-foreground">หรือ กรอกข้อมูลด้านล่าง</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information */}
            <div className="space-y-4">
              <Input
                label="ชื่อ-นามสกุล"
                value={name}
                onChange={setName}
                placeholder="กรอกชื่อ-นามสกุล"
                required
              />

              <Input
                label="เบอร์โทรศัพท์"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="กรอกเบอร์โทรศัพท์"
                required
              />

              <Input
                label="อีเมล"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="กรอกอีเมล"
                required
              />

              {/* Password fields - only show if not using Facebook */}
              {!hasPendingFacebook && (
                <>
                  <Input
                    label="รหัสผ่าน"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                    required
                  />

                  <Input
                    label="ยืนยันรหัสผ่าน"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required
                  />
                </>
              )}

              {hasPendingFacebook && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  คุณกำลังลงทะเบียนด้วย Facebook - ไม่จำเป็นต้องตั้งรหัสผ่าน
                </div>
              )}

              {/* Base Location */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  จังหวัดที่คุณอยู่ปัจจุบัน <span className="text-destructive">*</span>
                </label>
                <select
                  value={baseLocation}
                  onChange={(e) => {
                    setBaseLocation(e.target.value);
                    if (e.target.value !== 'ต่างจังหวัด') {
                      setProvince('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">เลือกจังหวัด</option>
                  <optgroup label="กรุงเทพฯ และปริมณฑล">
                    {BANGKOK_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </optgroup>
                  <option value="ต่างจังหวัด">ต่างจังหวัด</option>
                </select>
              </div>

              {baseLocation === 'ต่างจังหวัด' && (
                <Input
                  label="จังหวัด"
                  value={province}
                  onChange={setProvince}
                  placeholder="กรอกจังหวัด"
                  required
                />
              )}
            </div>

            {/* Creator Category */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">ระบุหมวดหมู่เนื้อหาของคุณ</h3>
              <Select<{ value: string; label: string }, true>
                options={CREATOR_CATEGORIES}
                isMulti
                value={creatorCategory}
                onChange={(selected) =>
                  setCreatorCategory(selected ? [...selected] : [])
                }
              />
            </div>

            {/* Social Media Accounts */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-semibold text-primary">Social Media</h3>
              <p className="text-sm text-muted-foreground -mt-2">กรอกข้อมูลอย่างน้อย 1 แพลตฟอร์ม</p>

              {/* Facebook */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Facebook URL"
                    value={facebookUrl}
                    onChange={setFacebookUrl}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div>
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={facebookFollowers}
                    onChange={setFacebookFollowers}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Instagram URL"
                    value={instagramUrl}
                    onChange={setInstagramUrl}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div>
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={instagramFollowers}
                    onChange={setInstagramFollowers}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* TikTok */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="TikTok URL"
                    value={tiktokUrl}
                    onChange={setTiktokUrl}
                    placeholder="https://tiktok.com/@..."
                  />
                </div>
                <div>
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={tiktokFollowers}
                    onChange={setTiktokFollowers}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* YouTube */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="YouTube URL"
                    value={youtubeUrl}
                    onChange={setYoutubeUrl}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div>
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={youtubeFollowers}
                    onChange={setYoutubeFollowers}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Twitter */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="X (Twitter) URL"
                    value={twitterUrl}
                    onChange={setTwitterUrl}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div>
                  <Input
                    label="จำนวนผู้ติดตาม"
                    type="number"
                    value={twitterFollowers}
                    onChange={setTwitterFollowers}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Budget per Post */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center gap-4">
                <Input
                  label="Budgets"
                  type="number"
                  value={budget}
                  onChange={setBudget}
                  placeholder="0"
                />
                <span className="self-end">บาท/โพสต์</span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">ประเภทผู้สมัคร</h3>
              
              <div className="flex gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="general"
                    checked={status === 'general'}
                    onChange={(e) => {
                      setStatus(e.target.value as 'general');
                      setProjectName('');
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <span>บุคคลทั่วไป</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="resident"
                    checked={status === 'resident'}
                    onChange={(e) => setStatus(e.target.value as 'resident')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>ลูกบ้านแอสเซทไวส์</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="partner"
                    checked={status === 'partner'}
                    onChange={(e) => setStatus(e.target.value as 'partner')}
                    className="w-4 h-4 text-primary"
                  />
                  <span>แอสเซทไวส์ พาร์ทเนอร์</span>
                </label>
              </div>

              {status === 'resident' && (
                <Input
                  label="กรุณากรอกชื่อโครงการ"
                  value={projectName}
                  onChange={setProjectName}
                  placeholder="กรอกชื่อโครงการที่อยู่อาศัย"
                  required
                />
              )}

              {status === 'partner' && (
                <Select 
                  options={PARTNERS_TYPE} 
                />
              )}
            </div>
            <Button type="submit" fullWidth variant="accent" disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียน'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              เป็นสมาชิกอยู่แล้ว? 
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // Trigger login modal from header
                  const loginButton = document.querySelector('header button[class*="bg-primary"]') as HTMLButtonElement;
                  loginButton?.click();
                }}
                className="text-primary hover:underline ml-1 cursor-pointer"
              >
                เข้าสู่ระบบที่นี่
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
