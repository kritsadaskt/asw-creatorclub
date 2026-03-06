export interface CreatorProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  baseLocation: string;
  province?: string; // For when baseLocation is 'ต่างจังหวัด'
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
  followerCounts: {
    facebook?: number;
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    twitter?: number;
  };
  budgets: {
    facebook?: number;
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    twitter?: number;
  };
  status: 'general' | 'resident'; // บุคคลทั่วไป or ลูกบ้านแอสเซทไวส์
  projectName?: string; // For when status is 'resident'
  createdAt: string;
  // Authentication fields
  facebookId?: string; // Facebook user ID (for Facebook login)
  passwordHash?: string; // Hashed password (for traditional login)
}

export interface Project {
  id: string;
  name: string;
  type: 'condo' | 'house';
  location: string;
  description?: string;
  imageUrl?: string;
  googleDriveUrl?: string;
  googleDrivePassword?: string;
  // 1 = RTM, 2 = New, 3 = Pre-Sale
  projectStatus?: 1 | 2 | 3;
  startComm?: string;
  maxComm?: string;
  baseUrl: string;
  createdAt: string;
}

export interface AffiliateLink {
  id: string;
  creatorId: string;
  campaignName: string;
  projectId?: string;
  campaignId?: string;
  url: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  detail: string;
  promotionImg?: string;
  leadTarget: string;
  budget: number;
  utmSource: string;
  utmMedium: string;
  utmId: string;
  utmCampaign: string;
  landingUrl: string;
  projectIds: string[];
  createdAt: string;
}

export type UserRole = 'creator' | 'admin';