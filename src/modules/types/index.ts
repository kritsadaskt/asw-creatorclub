export interface CreatorProfile {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  phone: string;
  baseLocation: string;
  province?: string; // For when baseLocation is 'ต่างจังหวัด'
  /**
   * Multiple categories per creator.
   * Stored in Supabase `profiles.categories` (text[]).
   * Old data may still have single `category` string in the DB; we map it to this array in storage utils.
   */
  categories: string[];
  followers: number;
  profileImage?: string;
  socialAccounts: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    lemon8?: string;
  };
  followerCounts: {
    facebook?: number;
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    twitter?: number;
    lemon8?: number;
  };
  budgets: {
    facebook?: number;
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    twitter?: number;
  };
  // Approval status for admin workflow:
  // 0 = rejected, 1 = approved, 2 = inactive, 3 = pending
  approvalStatus: 0 | 1 | 2 | 3;
  status: 'general' | 'resident' | 'partner'; // บุคคลทั่วไป or ลูกบ้านแอสเซทไวส์ or แอสเซทไวส์ พาร์ทเนอร์
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
  /**
   * Fallback thumbnail URL from DB (`projects.thumb_url`) used when no uploaded image is set.
   */
  thumbUrl?: string;
  googleDriveUrl?: string;
  googleDrivePassword?: string;
  // Text status from DB: 'ready' | 'new' | 'sold_out'
  projectStatus?: string;
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
  postLinks?: string[];
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