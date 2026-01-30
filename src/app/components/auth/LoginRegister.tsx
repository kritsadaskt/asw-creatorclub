import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { CreatorProfile } from '../../types';
import { 
  saveCreator, 
  getCreatorByEmail, 
  getCreatorByFacebookId,
  setCurrentUser, 
  generateUUID,
  authenticateCreator 
} from '../../utils/storage';
import { loginWithFacebook, getFacebookUserInfo } from '../../utils/facebook';
import { hashPassword, validatePassword, validatePasswordConfirm } from '../../utils/password';

interface LoginRegisterProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

export function LoginRegister({ onLogin }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const handleFacebookAuth = async () => {
    setError('');
    setFacebookLoading(true);

    try {
      await loginWithFacebook();
      const fbUser = await getFacebookUserInfo();

      // Try to find user by Facebook ID or email
      let creator = await getCreatorByFacebookId(fbUser.id);
      if (!creator && fbUser.email) {
        creator = await getCreatorByEmail(fbUser.email);
      }

      if (creator) {
        // User exists, log them in
        setCurrentUser(creator.id, 'creator');
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับ ${creator.name}`,
        });
        onLogin(creator.id, 'creator');
      } else if (isLogin) {
        // Login mode but user not found
        setError('ไม่พบบัญชีผู้ใช้ กรุณาลงทะเบียนก่อน');
      } else {
        // Registration mode - pre-fill and let user complete
        if (fbUser.name) setName(fbUser.name);
        if (fbUser.email) setEmail(fbUser.email);
        sessionStorage.setItem('pendingFacebookId', fbUser.id);
        toast.info('ข้อมูลจาก Facebook ถูกกรอกแล้ว', {
          description: 'กรุณากรอกข้อมูลที่เหลือ',
        });
      }
    } catch (err) {
      console.error('Facebook auth error:', err);
      if (!(err instanceof Error && err.message.includes('cancelled'))) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ Facebook');
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
      // Admin login shortcut
      if (email === 'admin@creatorsclub.com' && password === 'admin') {
        setCurrentUser('admin', 'admin');
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: 'ยินดีต้อนรับผู้ดูแลระบบ'
        });
        onLogin('admin', 'admin');
        return;
      }

      const pendingFacebookId = sessionStorage.getItem('pendingFacebookId');

      if (isLogin) {
        // Login with password
        const creator = await authenticateCreator(email, password);
        if (creator) {
          setCurrentUser(creator.id, 'creator');
          toast.success('เข้าสู่ระบบสำเร็จ!', {
            description: `ยินดีต้อนรับ ${creator.name}`
          });
          onLogin(creator.id, 'creator');
        } else {
          const existingCreator = await getCreatorByEmail(email);
          if (existingCreator && existingCreator.facebookId && !existingCreator.passwordHash) {
            setError('บัญชีนี้ลงทะเบียนด้วย Facebook กรุณาเข้าสู่ระบบด้วย Facebook');
          } else {
            setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          }
        }
      } else {
        // Register
        const existingCreator = await getCreatorByEmail(email);
        if (existingCreator) {
          setError('อีเมลนี้ถูกใช้งานแล้ว');
          return;
        }

        // Validate password if not using Facebook
        if (!pendingFacebookId) {
          const pwdValidation = validatePassword(password);
          if (!pwdValidation.isValid) {
            setError(pwdValidation.error || 'รหัสผ่านไม่ถูกต้อง');
            return;
          }
          const confirmValidation = validatePasswordConfirm(password, confirmPassword);
          if (!confirmValidation.isValid) {
            setError(confirmValidation.error || 'รหัสผ่านไม่ตรงกัน');
            return;
          }
        }

        const passwordHash = !pendingFacebookId ? await hashPassword(password) : undefined;

        const newCreator: CreatorProfile = {
          id: generateUUID(),
          email,
          name,
          phone,
          category: '',
          followers: 0,
          socialAccounts: {},
          createdAt: new Date().toISOString(),
          baseLocation: '',
          followerCounts: {},
          budgets: {},
          status: 'general',
          facebookId: pendingFacebookId || undefined,
          passwordHash,
        };

        await saveCreator(newCreator);
        sessionStorage.removeItem('pendingFacebookId');
        setCurrentUser(newCreator.id, 'creator');
        toast.success('ลงทะเบียนสำเร็จ!', {
          description: 'ยินดีต้อนรับเข้าสู่ระบบ'
        });
        onLogin(newCreator.id, 'creator');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const hasPendingFacebook = typeof window !== 'undefined' && sessionStorage.getItem('pendingFacebookId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-primary mb-2">ระบบจัดการ Creator & Influencer</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียนใหม่'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Facebook Button */}
        <button
          type="button"
          onClick={handleFacebookAuth}
          disabled={facebookLoading}
          className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          {facebookLoading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบด้วย Facebook' : 'ลงทะเบียนด้วย Facebook')}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-muted-foreground">หรือ</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
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
            </>
          )}

          <Input
            label="อีเมล"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="กรอกอีเมล"
            required
          />

          {!hasPendingFacebook && (
            <>
              <Input
                label="รหัสผ่าน"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={isLogin ? 'กรอกรหัสผ่าน' : 'กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)'}
                required
              />

              {!isLogin && (
                <Input
                  label="ยืนยันรหัสผ่าน"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required
                />
              )}
            </>
          )}

          {hasPendingFacebook && !isLogin && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              คุณกำลังลงทะเบียนด้วย Facebook - ไม่จำเป็นต้องตั้งรหัสผ่าน
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียน')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              sessionStorage.removeItem('pendingFacebookId');
            }}
            className="text-primary hover:underline"
          >
            {isLogin ? 'ยังไม่มีบัญชี? ลงทะเบียนที่นี่' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>

        <div className="mt-6 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            สำหรับทีมงาน: ใช้ admin@creatorsclub.com / admin
          </p>
        </div>
      </div>
    </div>
  );
}
