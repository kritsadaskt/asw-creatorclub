import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';

interface CampaignLayoutProps {
  children: ReactNode;
}

export function CampaignLayout({ children }: CampaignLayoutProps) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const handleLogin = (id: string, role: 'creator' | 'admin') => {
    setIsLoggedIn(true);

    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      <Header onLogin={handleLogin} isLoggedInFromParent={isLoggedIn} />
      <main className="flex-1 pt-6 pb-10">
        <div className="container mx-auto px-4 md:px-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

