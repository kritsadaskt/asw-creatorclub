export type AdminAffiliateTopCreatorRow = {
  creatorId: string;
  displayName: string;
  /** Raw `profiles.type` for `CreatorBadge` (badge hidden for บุคคลทั่วไป). */
  inviteType: string;
  linkCount: number;
  totalClicks: number | null;
};

export type AdminAffiliateTopProjectRow = {
  projectId: string | null;
  projectName: string;
  linkCount: number;
  creatorCount: number;
};

/** One affiliate link row that has at least one submitted post URL in `post_links` (for admin review). */
export type AdminAffiliateSubmittedPostLinkRow = {
  linkId: string;
  creatorId: string;
  displayName: string;
  inviteType: string;
  campaignName: string;
  affiliateUrl: string;
  postLinks: string[];
  projectName: string;
  createdAt: string;
};

export type AdminAffiliateReportsResponse = {
  topCreators: AdminAffiliateTopCreatorRow[];
  topProjects: AdminAffiliateTopProjectRow[];
  shlinkConfigured: boolean;
  totalLinks: number;
  totalClicks: number | null;
  /** Count of affiliate rows (non-admin) with at least one post URL in `post_links`; same as `submittedPostAffiliateLinks.length`. */
  linksWithSubmittedPosts: number;
  submittedPostAffiliateLinks: AdminAffiliateSubmittedPostLinkRow[];
  /** Latest Shlink sync time (UTC ISO) from `affiliate_link_click_stats`, if any. */
  statsSyncedAt?: string | null;
};
