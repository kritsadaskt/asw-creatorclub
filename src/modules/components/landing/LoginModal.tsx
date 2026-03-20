'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import {
  getCreatorByEmail,
  getCreatorByFacebookId,
  setCurrentUser,
  authenticateCreator,
  saveCreator,
} from '../../utils/storage';
import { loginWithFacebook, getFacebookUserInfo, fetchAndUploadFacebookProfileImage } from '../../utils/facebook';
import { isFacebookProfileImageUrl } from '../../utils/profileImage';
import { setSession } from '../../utils/auth';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

export function LoginModal({ onClose, onLogin }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const handleFacebookLogin = async () => {
    setError('');
    setFacebookLoading(true);

    try {
      const loginResponse = await loginWithFacebook();
      const fbUser = await getFacebookUserInfo();
      const accessToken = loginResponse.authResponse?.accessToken;

      // Try to find user by Facebook ID first
      let creator = await getCreatorByFacebookId(fbUser.id);

      // If not found by Facebook ID, try by email
      if (!creator && fbUser.email) {
        creator = await getCreatorByEmail(fbUser.email);
      }

      if (creator) {
        // Re-host Facebook profile image if current one is from Facebook (lookaside or Graph URL often 404 in browser)
        const isFacebookUrl =
          isFacebookProfileImageUrl(creator.profileImage) ||
          creator.profileImage?.includes('graph.facebook.com');
        if (accessToken && isFacebookUrl) {
          const newUrl = await fetchAndUploadFacebookProfileImage(accessToken, fbUser.id);
          if (newUrl) {
            await saveCreator({ ...creator, profileImage: newUrl });
          }
        }
        setCurrentUser(creator.id, 'creator');
        setSession({ id: creator.id, role: 'creator' });
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับ ${creator.name}`,
        });
        onLogin(creator.id, 'creator');
        onClose();
      } else {
        setError('ไม่พบบัญชีผู้ใช้ กรุณาลงทะเบียนก่อน');
      }
    } catch (err) {
      console.error('Facebook login error:', err);
      if (err instanceof Error && err.message.includes('cancelled')) {
        // User cancelled, don't show error
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Facebook');
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
      // Admin login shortcut
      if (email === 'admin@creatorsclub.com' && password === 'admin') {
        setCurrentUser('admin', 'admin');
        setSession({ id: 'admin', role: 'admin' });
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: 'ยินดีต้อนรับผู้ดูแลระบบ',
        });
        onLogin('admin', 'admin');
        onClose();
        return;
      }

      // Creator login with password
      const creator = await authenticateCreator(email, password);
      if (creator) {
        setCurrentUser(creator.id, 'creator');
        setSession({ id: creator.id, role: 'creator' });
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับ ${creator.name}`,
        });
        onLogin(creator.id, 'creator');
        onClose();
      } else {
        // Check if user exists but registered via Facebook
        const existingCreator = await getCreatorByEmail(email);
        if (existingCreator && existingCreator.facebookId && !existingCreator.passwordHash) {
          setError('บัญชีนี้ลงทะเบียนด้วย Facebook กรุณาเข้าสู่ระบบด้วย Facebook');
        } else {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-primary text-center mb-4 text-2xl font-bold pt-7">
          เข้าสู่ระบบ Creators Club
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Facebook Login Button */}
        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={facebookLoading}
          className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          {facebookLoading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบด้วย Facebook'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-muted-foreground">หรือ</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="อีเมล"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="กรอกอีเมล"
            required
          />

          <Input
            label="รหัสผ่าน"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="กรอกรหัสผ่าน"
            required
          />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ'}
          </Button>
          <p className='text-sm text-muted-foreground text-center'>
            ลืมรหัสผ่าน ?{' '}
            <button
              id="forgetPasswordButton"
              type="button"
              className="text-primary text-sm hover:underline cursor-pointer"
              onClick={() => {
                onClose();
                router.push('/account-recovery');
              }}
            >
              คลิกที่นี่
            </button>
          </p>
        </form>

        <div className="mt-6 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            สำหรับทีมงาน: ใช้ admin@creatorsclub.com / admin
          </p>
        </div>
      </div>
    </div>
  );
}
