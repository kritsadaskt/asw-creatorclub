export interface KOLProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  category: string;
  followers: number;
  profileImage?: string;
  socialAccounts: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
  createdAt: string;
}

export interface AffiliateLink {
  id: string;
  kolId: string;
  campaignName: string;
  url: string;
  createdAt: string;
}

export type UserRole = 'kol' | 'admin';