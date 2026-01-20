import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { KOLProfile } from '../../types';
import { saveKOL, getKOLByEmail, setCurrentUser } from '../../utils/storage';

interface LoginRegisterProps {
  onLogin: (id: string, role: 'kol' | 'admin') => void;
}

export function LoginRegister({ onLogin }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin login shortcut
    if (email === 'admin@kol.com' && password === 'admin') {
      setCurrentUser('admin', 'admin');
      toast.success('เข้าสู่ระบบสำเร็จ!', {
        description: 'ยินดีต้อนรับผู้ดูแลระบบ'
      });
      onLogin('admin', 'admin');
      return;
    }

    if (isLogin) {
      // Login
      const kol = getKOLByEmail(email);
      if (kol) {
        setCurrentUser(kol.id, 'kol');
        toast.success('เข้าสู่ระบบสำเร็จ!', {
          description: `ยินดีต้อนรับ ${kol.name}`
        });
        onLogin(kol.id, 'kol');
      } else {
        setError('ไม่พบบัญชีผู้ใช้ กรุณาลงทะเบียนก่อน');
      }
    } else {
      // Register
      const existingKOL = getKOLByEmail(email);
      if (existingKOL) {
        setError('อีเมลนี้ถูกใช้งานแล้ว');
        return;
      }

      const newKOL: KOLProfile = {
        id: `kol_${Date.now()}`,
        email,
        name,
        phone,
        category: '',
        followers: 0,
        socialAccounts: {},
        createdAt: new Date().toISOString()
      };

      saveKOL(newKOL);
      setCurrentUser(newKOL.id, 'kol');
      toast.success('ลงทะเบียนสำเร็จ!', {
        description: 'ยินดีต้อนรับเข้าสู่ระบบ'
      });
      onLogin(newKOL.id, 'kol');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-primary mb-2">ระบบจัดการ KOL & Influencer</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียนใหม่'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error}
          </div>
        )}

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

          <Input
            label="รหัสผ่าน"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="กรอกรหัสผ่าน"
            required
          />

          <Button type="submit" fullWidth>
            {isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียน'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-primary hover:underline"
          >
            {isLogin ? 'ยังไม่มีบัญชี? ลงทะเบียนที่นี่' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </button>
        </div>

        <div className="mt-6 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            สำหรับทีมงาน: ใช้ admin@kol.com / admin
          </p>
        </div>
      </div>
    </div>
  );
}