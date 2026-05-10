'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BASE_PATH } from '@/lib/publicPath';
import { Input } from '../components/shared/Input';
import { Button } from '../components/shared/Button';
import { supabase } from '../utils/supabase';
import { getCreatorByEmail } from '../utils/storage';
import { validatePassword } from '../utils/password';
import { ArrowLeftIcon, Loader2 } from 'lucide-react';

type Step = 'email' | 'otp' | 'newPassword' | 'done';

export function AccountRecovery() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailError('');

    try {
      if (!email) {
        throw new Error('INVALID_EMAIL');
      }

      const creator = await getCreatorByEmail(email);

      // If creator not found, log and ask user to register instead of showing OTP step
      if (!creator) {
        await supabase.from('password_recovery_logs').insert({
          email,
          action: 'request',
          status: 'failed',
          message: 'email_not_found',
        });
        setEmailError('ไม่พบบัญชีจากอีเมลนี้ กรุณาลงทะเบียนใหม่');
        return;
      }

      // Facebook-only accounts without password should use Facebook login,
      // not email/password recovery. Log and show generic message.
      if (creator.facebookId && !creator.passwordHash) {
        await supabase.from('password_recovery_logs').insert({
          profile_id: creator.id,
          email,
          action: 'request',
          status: 'failed',
          recovery_request_id: null,
          message: 'facebook_only_no_password',
        });
        toast.success('หากอีเมลนี้มีอยู่ ระบบได้ส่งรหัสยืนยันให้แล้ว');
        // Do not create OTP; user shouldล็อกอินด้วย Facebook และตั้งรหัสผ่านในโปรไฟล์
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: requestRow, error: insertError } = await supabase
        .from('password_recovery_requests')
        .insert({
          profile_id: creator.id,
          email,
          otp_code: otp,
          otp_expires_at: otpExpiresAt,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating password recovery request:', insertError);
        throw new Error('REQUEST_FAILED');
      }

      const emailRes = await fetch(`${BASE_PATH}/api/send-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text().catch(() => '');
        console.error('send-password-otp failed:', emailRes.status, errText);
        throw new Error('EMAIL_SEND_FAILED');
      }

      await supabase.from('password_recovery_logs').insert({
        profile_id: creator.id,
        email,
        action: 'request',
        status: 'success',
        recovery_request_id: requestRow.id,
      });

      toast.success('หากอีเมลนี้มีอยู่ ระบบได้ส่งรหัสยืนยันให้แล้ว');
      setStep('otp');
    } catch {
      toast.error('ไม่สามารถส่งรหัสยืนยันได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_PATH}/api/account-recovery/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        resetToken?: string;
        error?: string;
      };

      if (!res.ok || !body.success || !body.resetToken) {
        throw new Error(body.error || 'INVALID_OR_EXPIRED_OTP');
      }

      setResetToken(body.resetToken);

      toast.success('ยืนยันรหัสสำเร็จ');
      setStep('newPassword');
    } catch {
      toast.error('รหัสไม่ถูกต้องหรือหมดอายุ');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    const { isValid, error } = validatePassword(newPassword);
    if (!isValid) {
      toast.error(error || 'รหัสผ่านไม่ถูกต้อง');
      return;
    }

    if (!resetToken) {
      toast.error('การยืนยันหมดอายุหรือไม่สมบูรณ์ กรุณาขอรหัสยืนยันใหม่');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE_PATH}/api/account-recovery/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, resetToken }),
      });

      if (!res.ok) {
        throw new Error('FAILED_TO_UPDATE_PASSWORD');
      }

      toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
      setStep('done');
    } catch {
      toast.error('ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="password-recover-header mb-5">
          <button type="button" className="text-primary text-sm hover:underline ml-1 cursor-pointer flex items-center gap-2" onClick={() => router.push('/')}><ArrowLeftIcon className="w-5 h-5" /> กลับ</button>
        </div>
        <h1 className="text-2xl font-bold text-center text-primary mb-6">
          กู้คืนรหัสผ่าน
        </h1>
        <p className="text-muted-foreground text-center">
          { step === 'email' ? 'กรุณากรอกอีเมลที่ใช้สมัครเพื่อกู้คืนรหัสผ่าน' : step === 'otp' ? 'กรุณากรอกรหัสยืนยันที่ได้รับทางอีเมล' : step === 'newPassword' ? 'กรุณากรอกรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่านสำเร็จ'}
        </p>

        {step === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {emailError && (
              <div className="text-sm text-destructive">
                {emailError}{' '}
                <button
                  type="button"
                  className="text-primary text-sm hover:underline ml-1 cursor-pointer"
                  onClick={() => router.push('/#register-section')}
                >
                  ลงทะเบียนใหม่
                </button>
              </div>
            )}
            <Input
              label="อีเมล"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="กรอกอีเมลที่ใช้สมัคร"
              required
            />
            <Button type="submit" fullWidth disabled={loading} className='flex items-center gap-2 justify-center'>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ส่งรหัสยืนยัน'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <Input
              label="รหัสยืนยัน (6 หลัก)"
              type="text"
              value={otp}
              onChange={(value) => setOtp(value.replace(/\\D/g, '').slice(0, 6))}
              placeholder="กรอกรหัสยืนยัน"
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส'}
            </Button>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="รหัสผ่านใหม่"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="กรอกรหัสผ่านใหม่"
              required
            />
            <Input
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              เปลี่ยนรหัสผ่านเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย
            </p>
            <Button
              type="button"
              fullWidth
              onClick={() => {
                router.push('/');
              }}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

