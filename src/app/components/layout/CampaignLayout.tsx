import { ReactNode } from 'react';
import { Header } from '../landing/Header';
import Footer from '../landing/Footer';

interface CampaignLayoutProps {
  onLogin?: (id: string, role: 'creator' | 'admin') => void;
  children: ReactNode;
}

export function CampaignLayout({ onLogin, children }: CampaignLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-primary/10">
      <Header onLogin={onLogin ?? (() => {})} />
      <main className="flex-1 pt-6 pb-10">
        <div className="container mx-auto px-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

