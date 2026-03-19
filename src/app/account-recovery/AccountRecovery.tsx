import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '../components/shared/Input';
import { Button } from '../components/shared/Button';
import { supabase } from '../utils/supabase';
import { getCreatorByEmail } from '../utils/storage';
import { hashPassword, validatePassword } from '../utils/password';
import { ArrowLeftIcon } from 'lucide-react';

type Step = 'email' | 'otp' | 'newPassword' | 'done';

export function AccountRecovery() {
  const navigate = useNavigate();
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

      // TODO: replace with real email sending
      const functionsBase = import.meta.env.VITE_SUPABASE_URL!.replace(
        ".supabase.co",
        ".functions.supabase.co",
      );
      
      await fetch(`${functionsBase}/send-password-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

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
      const { data: recoveryRequest, error } = await supabase
        .from('password_recovery_requests')
        .select('*')
        .eq('email', email)
        .order('requested_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !recoveryRequest) {
        throw new Error('INVALID_OR_EXPIRED_OTP');
      }

      const now = new Date();
      const expiresAt = new Date(recoveryRequest.otp_expires_at);

      if (recoveryRequest.status !== 'pending' || now > expiresAt) {
        await supabase
          .from('password_recovery_requests')
          .update({ status: 'expired' })
          .eq('id', recoveryRequest.id);
        throw new Error('INVALID_OR_EXPIRED_OTP');
      }

      const attempts = recoveryRequest.attempts ?? 0;
      if (attempts >= 5) {
        await supabase
          .from('password_recovery_requests')
          .update({ status: 'failed' })
          .eq('id', recoveryRequest.id);
        throw new Error('INVALID_OR_EXPIRED_OTP');
      }

      if (recoveryRequest.otp_code !== otp) {
        await supabase
          .from('password_recovery_requests')
          .update({ attempts: attempts + 1 })
          .eq('id', recoveryRequest.id);

        await supabase.from('password_recovery_logs').insert({
          profile_id: recoveryRequest.profile_id,
          email,
          action: 'otp_failed',
          status: 'failed',
          recovery_request_id: recoveryRequest.id,
          message: 'invalid_code',
        });

        throw new Error('INVALID_OR_EXPIRED_OTP');
      }

      const newResetToken = crypto.randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await supabase
        .from('password_recovery_requests')
        .update({
          status: 'verified',
          reset_token: newResetToken,
          reset_token_expires_at: resetTokenExpiresAt,
        })
        .eq('id', recoveryRequest.id);

      await supabase.from('password_recovery_logs').insert({
        profile_id: recoveryRequest.profile_id,
        email,
        action: 'otp_verified',
        status: 'success',
        recovery_request_id: recoveryRequest.id,
      });

      setResetToken(newResetToken);

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

    setLoading(true);

    try {
      const { data: recoveryRequest, error: requestError } = await supabase
        .from('password_recovery_requests')
        .select('*')
        .eq('email', email)
        .order('requested_at', { ascending: false })
        .limit(1)
        .single();

      if (requestError || !recoveryRequest) {
        throw new Error('INVALID_RESET_REQUEST');
      }

      if (recoveryRequest.status !== 'verified') {
        throw new Error('INVALID_RESET_REQUEST');
      }

      if (resetToken && recoveryRequest.reset_token !== resetToken) {
        throw new Error('INVALID_RESET_REQUEST');
      }

      if (recoveryRequest.reset_token_expires_at) {
        const now = new Date();
        const expiresAt = new Date(recoveryRequest.reset_token_expires_at);
        if (now > expiresAt) {
          throw new Error('INVALID_RESET_REQUEST');
        }
      }

      const passwordHash = await hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('id', recoveryRequest.profile_id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('FAILED_TO_UPDATE_PASSWORD');
      }

      await supabase
        .from('password_recovery_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', recoveryRequest.id);

      await supabase.from('password_recovery_logs').insert({
        profile_id: recoveryRequest.profile_id,
        email,
        action: 'reset_success',
        status: 'success',
        recovery_request_id: recoveryRequest.id,
      });

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
          <button type="button" className="text-primary text-sm hover:underline ml-1 cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}><ArrowLeftIcon className="w-5 h-5" /> กลับ</button>
        </div>
        <h1 className="text-2xl font-bold text-center text-primary mb-6">
          กู้คืนรหัสผ่าน
        </h1>
        <p className="text-muted-foreground text-center">
          กรุณากรอกอีเมลที่ใช้สมัครเพื่อกู้คืนรหัสผ่าน
        </p>

        {step === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {emailError && (
              <div className="text-sm text-destructive">
                {emailError}{' '}
                <button
                  type="button"
                  className="text-primary text-sm hover:underline ml-1 cursor-pointer"
                  onClick={() => navigate('/#register-section')}
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
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : 'ส่งรหัสยืนยัน'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              เราได้ส่งรหัส 6 หลักไปที่อีเมลของคุณ กรุณากรอกรหัสเพื่อยืนยันตัวตน
            </p>
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
                navigate('/');
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

