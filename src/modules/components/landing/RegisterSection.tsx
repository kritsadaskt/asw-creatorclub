import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile } from '../../types';
import { saveCreator, getCreatorByEmail, getCreatorByFacebookId, setCurrentUser, generateUUID, getProjects } from '../../utils/storage';
import { loginWithFacebook, getFacebookUserInfo, fetchAndUploadFacebookProfileImage } from '../../utils/facebook';
import { hashPassword, validatePassword, validatePasswordConfirm } from '../../utils/password';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { FaFacebook } from 'react-icons/fa6';
import Select from 'react-select';
import { Lemon8Icon } from '../../utils/svg';
import SocialAccounts from '../layout/SocialAccounts';
import { BASE_PATH } from '@/lib/publicPath';
import { Switch } from '../ui/switch';

import { CREATOR_CATEGORIES } from './registerInviteCategories';
import Link from 'next/link';

type SelectOption = { value: string; label: string };

interface RegisterSectionProps {
  onLogin: (id: string, role: 'creator' | 'admin', redirectTo?: string) => void;
  /** When set, the category field is hidden and these labels are saved (invite link flow). */
  fixedCategoryLabels?: string[];
  variant?: 'landing' | 'standalone';
  /** Raw invite type from register URL (e.g. MUT, MI_THAILAND). */
  inviteType?: string;
}

const BANGKOK_PROVINCES = [
  'กรุงเทพมหานคร',
  'นนทบุรี',
  'ปทุมธานี',
  'สมุทรปราการ',
  'สมุทรสาคร',
  'นครปฐม'
];

type ProjectGroup = { label: string; options: SelectOption[] };

const fetchProjectOptions = async (): Promise<ProjectGroup[]> => {
  const projects = await getProjects();

  const groupsByType: Record<string, SelectOption[]> = {};

  projects.forEach((project) => {
    const typeKey = project.type || 'other';
    if (!groupsByType[typeKey]) {
      groupsByType[typeKey] = [];
    }
    groupsByType[typeKey].push({
      value: project.id,
      label: project.name,
    });
  });

  return Object.entries(groupsByType).map(([type, options]) => ({
    label: type === 'condo' ? 'คอนโดมิเนียม' : type === 'house' ? 'บ้านและทาวน์โฮม' : type === 'other' ? 'อื่นๆ' : type,
    options,
  }));
};

export function RegisterSection({
  onLogin,
  fixedCategoryLabels,
  variant = 'landing',
  inviteType,
}: RegisterSectionProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [province, setProvince] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState<ProjectGroup[]>([]);
  const [facebookLoading, setFacebookLoading] = useState(false);
  
  // Social media fields (managed via SocialAccounts component)
  const [socialData, setSocialData] = useState<{
    socialAccounts: {
      facebook?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      twitter?: string;
      lemon8?: string;
    };
    followerCounts: {
      facebook?: number;
      instagram?: number;
      tiktok?: number;
      youtube?: number;
      twitter?: number;
      lemon8?: number;
    };
    isValid: boolean;
    errors: Record<string, string>;
    socialError: string;
  }>({
    socialAccounts: {},
    followerCounts: {},
    isValid: false,
    errors: {},
    socialError: '',
  });

  // Budget fields
  const [budget, setBudget] = useState('');

  const [creatorCategory, setCreatorCategory] = useState<SelectOption[]>([]);

  const PARTNERS_TYPE = [
    { value: 'MUT', label: 'MUT' },
    { value: 'MI_THAILAND', label: 'MI Thailand' },
    { value: 'MISS_THAILAND', label: 'นางสาวไทย' },
    { value: 'MISTER_AND_MISS_GLOBAL_THAILAND', label: 'Mister and Miss Global Thailand' },
    { value: 'MISS_WORLD', label: 'Miss World' },
    { value: 'ASW', lable: 'พนักงานแอสเซทไวส์ และบริษัทในเครือ'},
    { value: 'other', label: 'Other' },
  ];

  // Status fields
  const [status, setStatus] = useState<'general' | 'resident' | 'partner'>('general');
  const [projectName, setProjectName] = useState('');
  const [partnerType, setPartnerType] = useState<string>('MUT');

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSocialErrors, setShowSocialErrors] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | ''>('');
  const [hideStatusField, setHideStatusField] = useState(false);

  const sendRegistrationPendingEmail = async (creator: Pick<CreatorProfile, 'name' | 'email'>) => {
    try {
      const res = await fetch(`${BASE_PATH}/api/creators/email/registration-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: creator.name, email: creator.email }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('registration-pending email failed:', res.status, errText);
      }
    } catch (error) {
      console.error('registration-pending email error:', error);
    }
  };

  const computePasswordStrength = (value: string): 'weak' | 'medium' | 'strong' | '' => {
    if (!value) return '';
    let score = 0;
    if (value.length >= 8) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[A-Z]/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    if (score <= 1) return 'weak';
    if (score === 2) return 'medium';
    return 'strong';
  };

  useEffect(() => {
    fetchProjectOptions()
      .then(setProjectOptions)
      .catch((err) => {
        console.error('Failed to load project options', err);
        setProjectOptions([]);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const href = window.location.href;
    const shouldHideStatus =
      href.includes('/register?type=') || href.includes('/register/?type=');

    setHideStatusField(shouldHideStatus);
  }, []);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^0[0-9]{9}$/;
  const validateField = (fieldKey: string, value: string): string => {
    switch (fieldKey) {
      case 'name':
        if (!value.trim()) return 'กรุณากรอกชื่อ';
        return '';
      case 'lastName':
        if (!value.trim()) return 'กรุณากรอกนามสกุล';
        return '';
      case 'phone':
        if (!value.trim()) return 'กรุณากรอกเบอร์โทรศัพท์';
        if (!phoneRegex.test(value.trim())) {
          return 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (10 หลัก)';
        }
        return '';
      case 'email':
        if (!value.trim()) return 'กรุณากรอกอีเมล';
        if (!emailRegex.test(value.trim())) {
          return 'กรุณากรอกอีเมลที่ถูกต้อง';
        }
        return '';
      case 'password':
        if (!value.trim()) return 'กรุณากรอกรหัสผ่าน';
        if (value.length < 8 || !/[0-9]/.test(value)) {
          return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัว';
        }
        return '';
      case 'confirmPassword':
        if (!value.trim()) return 'กรุณายืนยันรหัสผ่าน';
        if (value !== password) return 'รหัสผ่านไม่ตรงกัน';
        return '';
      case 'baseLocation':
        if (!value.trim()) return 'กรุณาเลือกจังหวัดที่คุณอยู่ปัจจุบัน';
        return '';
      case 'province':
        if (!value.trim()) return 'กรุณากรอกจังหวัด';
        return '';
      case 'projectName':
        if (!value.trim()) return 'กรุณาเลือกโครงการ';
        return '';
      default:
        return '';
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    const addError = (key: string, message: string) => {
      if (message) {
        newErrors[key] = message;
      }
    };

    addError('name', validateField('name', name));
    addError('lastName', validateField('lastName', lastName));
    addError('phone', validateField('phone', phone));
    addError('email', validateField('email', email));

    const hasPendingFacebook =
      typeof window !== 'undefined' && sessionStorage.getItem('pendingFacebookId');
    if (!hasPendingFacebook) {
      addError('password', validateField('password', password));
      addError('confirmPassword', validateField('confirmPassword', confirmPassword));
    }

    addError('baseLocation', validateField('baseLocation', baseLocation));
    if (baseLocation === 'ต่างจังหวัด') {
      addError('province', validateField('province', province));
    }

    if (status === 'resident') {
      addError('projectName', validateField('projectName', projectName));
    }

    if (!acceptedTerms) {
      newErrors.acceptedTerms = 'กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว';
    }

    if (!socialData.isValid) {
      setShowSocialErrors(true);
      if (socialData.socialError) {
        newErrors.social = socialData.socialError;
      } else {
        newErrors.social = 'กรุณากรอกข้อมูล Social Media อย่างน้อย 1 แพลตฟอร์ม';
      }
    } else {
      setShowSocialErrors(false);
    }

    setFieldErrors(newErrors);
    if (!socialData.isValid) {
      if (socialData.socialError) {
        newErrors.social = socialData.socialError;
      } else {
        newErrors.social = 'กรุณากรอกข้อมูล Social Media อย่างน้อย 1 แพลตฟอร์ม';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setTouchedFields((prev) => {
        const updated = { ...prev };
        Object.keys(newErrors).forEach((key) => {
                  updated[key] = true;
        });
        return updated;
      });
      return false;
    }

    return true;
  };
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

    const isValid = validateAll();
    if (!isValid) {
      return;
    }

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

      // Hash password if provided
      let passwordHash: string | undefined;
      if (!pendingFacebookId && password) {
        passwordHash = await hashPassword(password);
      }

      const newCreator: CreatorProfile = {
        id: generateUUID(),
        email,
        name: `${name} ${lastName}`.trim(),
        lastName: lastName.trim() || undefined,
        phone,
        baseLocation,
        province: baseLocation === 'ต่างจังหวัด' ? province : undefined,
        categories: creatorCategory.map((c) => c.label),
        followers: 0,
        profileImage: pendingFacebookPicture || undefined,
        socialAccounts: {
          facebook: socialData.socialAccounts.facebook || undefined,
          instagram: socialData.socialAccounts.instagram || undefined,
          tiktok: socialData.socialAccounts.tiktok || undefined,
          youtube: socialData.socialAccounts.youtube || undefined,
          twitter: socialData.socialAccounts.twitter || undefined,
          lemon8: socialData.socialAccounts.lemon8 || undefined,
        },
        followerCounts: {
          facebook: socialData.followerCounts.facebook,
          instagram: socialData.followerCounts.instagram,
          tiktok: socialData.followerCounts.tiktok,
          youtube: socialData.followerCounts.youtube,
          twitter: socialData.followerCounts.twitter,
          lemon8: socialData.followerCounts.lemon8,
        },
        budgets: {
          facebook: budget ? parseInt(budget) : undefined,
        },
        // 3 = pending approval by admin
        approvalStatus: 3,
        status,
        projectName: status === 'resident' ? projectName : undefined,
        type: inviteType,
        createdAt: new Date().toISOString(),
        facebookId: pendingFacebookId || undefined,
        passwordHash,
      };

      await saveCreator(newCreator);
      await sendRegistrationPendingEmail(newCreator);
      
      // Fire-and-forget webhook to external analyst endpoint
      try {
        await fetch(`${BASE_PATH}/api/creators/webhook-test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: newCreator.id,
            socialAccounts: newCreator.socialAccounts ?? {},
            email: newCreator.email,
            name: newCreator.name,
          }),
        });
      } catch (webhookError) {
        console.error('creator webhook-test error:', webhookError);
      }
      
      // Clear pending Facebook data
      sessionStorage.removeItem('pendingFacebookId');
      sessionStorage.removeItem('pendingFacebookPicture');
      
      setCurrentUser(newCreator.id, 'creator');
      toast.success('ลงทะเบียนสำเร็จ!', {
        description: 'ยินดีต้อนรับเข้าสู่ AssetWise Creators Club'
      });
      onLogin(newCreator.id, 'creator', '/thank-you');
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

  const sectionId = variant === 'landing' ? 'register-section' : undefined;

  return (
    <section id={sectionId} className="py-16 bg-primary/10">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className="bg-white rounded-2xl shadow-xl p-5 md:p-10">
          <div className="text-center mb-3">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-black">สมัครเป็นครีเอเตอร์</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Facebook Register Button */}
          {/* <button
            type="button"
            onClick={handleFacebookRegister}
            disabled={facebookLoading}
            className="w-fit mx-auto flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {facebookLoading ? 'กำลังดำเนินการ...' : 'ลงทะเบียนด้วย Facebook'}
          </button> */}

          {/* Divider */}
          {/* <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-muted-foreground">หรือ กรอกข้อมูลด้านล่าง</span>
            </div>
          </div> */}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-1/2">
                  <Input
                    label="ชื่อ"
                    value={name}
                    onChange={(value) => {
                      setName(value);
                      if (touchedFields.name) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          name: validateField('name', value),
                        }));
                      }
                    }}
                    placeholder="ชื่อ"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, name: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        name: validateField('name', name),
                      }));
                    }}
                    error={touchedFields.name ? fieldErrors.name : ''}
                  />
                </div>
                <div className="w-full md:w-1/2">
                  <Input
                    label="นามสกุล"
                    value={lastName}
                    onChange={(value) => {
                      setLastName(value);
                      if (touchedFields.lastName) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          lastName: validateField('lastName', value),
                        }));
                      }
                    }}
                    placeholder="นามสกุล"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, lastName: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        lastName: validateField('lastName', lastName),
                      }));
                    }}
                    error={touchedFields.lastName ? fieldErrors.lastName : ''}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-5">
                <div className="w-full md:w-1/2">
                  <Input
                    label="เบอร์โทรศัพท์"
                    type="tel"
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                      if (touchedFields.phone) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          phone: validateField('phone', value),
                        }));
                      }
                    }}
                    placeholder="กรอกเบอร์โทรศัพท์"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, phone: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        phone: validateField('phone', phone),
                      }));
                    }}
                    error={touchedFields.phone ? fieldErrors.phone : ''}
                  />
                </div>
                <div className="w-full md:w-1/2">
                  <Input
                    label="อีเมล"
                    type="email"
                    value={email}
                    onChange={(value) => {
                      setEmail(value);
                      if (touchedFields.email) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: validateField('email', value),
                        }));
                      }
                    }}
                    placeholder="กรอกอีเมล"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, email: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: validateField('email', email),
                      }));
                    }}
                    error={touchedFields.email ? fieldErrors.email : ''}
                  />
                </div>
              </div>

              {/* Password fields - only show if not using Facebook */}
              {!hasPendingFacebook && (
                <>
                  <Input
                    label="รหัสผ่าน"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      setPasswordStrength(computePasswordStrength(value));
                      if (touchedFields.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: validateField('password', value),
                        }));
                      }
                      if (touchedFields.confirmPassword) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          confirmPassword: validateField('confirmPassword', confirmPassword),
                        }));
                      }
                    }}
                    placeholder="กรอกรหัสผ่าน (อย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัว)"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, password: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: validateField('password', password),
                      }));
                    }}
                    error={touchedFields.password ? fieldErrors.password : ''}
                    rightIcon={showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    onRightIconClick={() => setShowPassword((prev) => !prev)}
                  />

                  {password && (
                    <div className="mt-1 text-xs">
                      <span
                        className={
                          passwordStrength === 'weak'
                            ? 'text-destructive'
                            : passwordStrength === 'medium'
                            ? 'text-amber-500'
                            : 'text-emerald-600'
                        }
                      >
                        รหัสผ่าน: {passwordStrength === 'weak' ? 'อ่อน' : passwordStrength === 'medium' ? 'ปานกลาง' : 'แข็งแรง'}
                      </span>
                      <p className="text-muted-foreground mt-0.5">
                        อย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัว
                      </p>
                    </div>
                  )}

                  <Input
                    label="ยืนยันรหัสผ่าน"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      if (touchedFields.confirmPassword) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          confirmPassword: validateField('confirmPassword', value),
                        }));
                      }
                    }}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required
                    onBlur={() => {
                      setTouchedFields((prev) => ({ ...prev, confirmPassword: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateField('confirmPassword', confirmPassword),
                      }));
                    }}
                    error={touchedFields.confirmPassword ? fieldErrors.confirmPassword : ''}
                    rightIcon={showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    onRightIconClick={() => setShowConfirmPassword((prev) => !prev)}
                  />
                </>
              )}

              {hasPendingFacebook && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  คุณกำลังลงทะเบียนด้วย Facebook - ไม่จำเป็นต้องตั้งรหัสผ่าน
                </div>
              )}

              <div className="h-5"></div>

              {/* Base Location */}
              <div className="mb-5">
                <h3 className="font-semibold text-primary mb-2">
                  จังหวัดที่คุณอยู่ปัจจุบัน <span className="text-destructive">*</span>
                </h3>
                <Select
                  instanceId="register-base-location"
                  options={[
                    {
                      label: 'กรุงเทพฯ และปริมณฑล',
                      options: BANGKOK_PROVINCES.map((prov) => ({
                        value: prov,
                        label: prov,
                      })),
                    },
                    {
                      label: '',
                      options: [
                        { value: 'ต่างจังหวัด', label: 'ต่างจังหวัด' },
                      ],
                    },
                  ]}
                  value={
                    baseLocation
                      ? BANGKOK_PROVINCES.includes(baseLocation)
                        ? { value: baseLocation, label: baseLocation }
                        : { value: 'ต่างจังหวัด', label: 'ต่างจังหวัด' }
                      : null
                  }
                  onChange={option => {
                    const value = option ? (Array.isArray(option) ? option[0].value : option.value) : '';
                    setBaseLocation(value);
                    if (value !== 'ต่างจังหวัด') {
                      setProvince('');
                    }
                  }}
                  placeholder="เลือกจังหวัด"
                  classNamePrefix="react-select"
                  isSearchable
                />
                {touchedFields.baseLocation && fieldErrors.baseLocation && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors.baseLocation}
                  </p>
                )}
              </div>

              {baseLocation === 'ต่างจังหวัด' && (
                <Input
                  label="จังหวัด"
                  value={province}
                  onChange={(value) => {
                    setProvince(value);
                    if (touchedFields.province) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        province: validateField('province', value),
                      }));
                    }
                  }}
                  placeholder="กรอกจังหวัด"
                  required
                  onBlur={() => {
                    setTouchedFields((prev) => ({ ...prev, province: true }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      province: validateField('province', province),
                    }));
                  }}
                  error={touchedFields.province ? fieldErrors.province : ''}
                />
              )}
            </div>

            <div className="mb-5">
              <h3 className="font-semibold text-primary mb-0">คุณเป็นครีเอเตอร์สายไหน ?</h3>
              <div className="block"><span className="text-muted-foreground text-sm">เลือกได้มากกว่า 1 รายการ</span></div>
              <Select
                instanceId="register-creator-category"
                options={CREATOR_CATEGORIES}
                isMulti
                value={creatorCategory}
                onChange={(selected) =>
                  setCreatorCategory(selected ? [...selected] : [])
                }
              />
            </div>

            <SocialAccounts
              initialSocialAccounts={socialData.socialAccounts}
              initialFollowerCounts={socialData.followerCounts}
              requireAtLeastOne={true}
              showErrors={showSocialErrors}
              onChange={(data) => setSocialData(data)}
            />

            {/* Budget per Post */}
            <div className="space-y-4 mb-5">
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

            {!hideStatusField && (
              <>
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-primary">คุณเป็นลูกบ้านแอสเซทไวส์หรือไม่ ?</h3>
                  <div className="flex items-start gap-4 pt-2">
                    <span className="font-normal text-neutral-600">ไม่ใช่</span>
                    <Switch checked={status === 'resident'} onCheckedChange={(checked) => setStatus(checked ? 'resident' : 'general')} size="lg" />
                    <span className="font-normal text-neutral-600">ใช่</span>
                  </div>
                </div>

                {status === 'resident' && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-primary">โปรดระบุโครงการ</h3>
                    <Select
                      instanceId="register-project-name"
                      options={projectOptions}
                      value={
                        projectName
                          ? projectOptions
                            .flatMap((group) => group.options)
                            .find((option) => option.value === projectName) ?? null
                          : null
                      }
                      onChange={(option: any) => {
                        const value = option ? option.value : '';
                        setProjectName(value);
                        if (touchedFields.projectName) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            projectName: validateField('projectName', value),
                          }));
                        }
                      }}
                      onBlur={() => {
                        setTouchedFields((prev) => ({ ...prev, projectName: true }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          projectName: validateField('projectName', projectName),
                        }));
                      }}
                      placeholder="เลือกโครงการ"
                      formatGroupLabel={(group) => (
                        <div
                          style={{
                            fontSize: 16,
                            color: 'var(--primary)',
                            fontWeight: 500,
                          }}
                        >
                          {group.label}
                        </div>
                      )}
                      formatOptionLabel={(option, { context }) =>
                        context === 'menu' ? (
                          <div
                            style={{
                              fontSize: 16,
                              paddingLeft: 20,
                            }}
                          >
                            {option.label}
                          </div>
                        ) : (
                          option.label
                        )
                      }
                      styles={{
                        option: (base, state) => ({
                          ...base,
                          cursor: 'pointer',
                          color: state.isFocused ? '#fff' : '#333',
                          backgroundColor: state.isFocused ? 'var(--accent)' : '#fff',
                        }),
                      }}
                    />
                    {touchedFields.projectName && fieldErrors.projectName && (
                      <p className="mt-2 text-xs text-destructive">
                        {fieldErrors.projectName}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="mt-4 flex items-start gap-2">
              <input
                id="accepted-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    if (e.target.checked && next.acceptedTerms) {
                      delete next.acceptedTerms;
                    }
                    return next;
                  });
                }}
                className="mt-1"
              />
              <label htmlFor="accepted-terms" className="text-sm font-normal text-muted-foreground">
                ฉันยอมรับ<Link href="/terms-and-conditions" className="text-primary underline">ข้อกำหนดการใช้บริการ</Link> (Terms and Conditions) และ<Link href="/privacy-policy" className="text-primary underline">นโยบายความเป็นส่วนตัว</Link> (Privacy Policy)
              </label>
            </div>
            {fieldErrors.acceptedTerms && (
              <p className="mt-1 text-xs text-destructive">
                {fieldErrors.acceptedTerms}
              </p>
            )}

            <Button type="submit" fullWidth variant="accent" disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : 'ลงทะเบียน'}
            </Button>

          </form>

          {!hideStatusField && (
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
          )}
        </div>
      </div>
    </section>
  );
}
