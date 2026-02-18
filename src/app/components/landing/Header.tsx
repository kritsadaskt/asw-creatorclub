import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { LoginModal } from './LoginModal';

interface HeaderProps {
  onLogin: (id: string, role: 'creator' | 'admin') => void;
}

export function Header({ onLogin }: HeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const scrollToRegister = () => {
    const registerSection = document.getElementById('register-section');
    if (registerSection) {
      registerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-border shadow-sm z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://assetwise.co.th/wp-content/themes/seed-spring/img/asw-logo_horizontal.svg" 
              alt="AssetWise Logo" 
              className="h-5"
            />
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={scrollToRegister}
              className="text-muted-foreground hover:text-accent transition-colors hidden md:block"
            >
              ลงทะเบียน
            </button>
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </header>
      <div className="h-16"></div>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={onLogin}
        />
      )}
    </>
  );
}