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

export type AdminAffiliateReportsResponse = {
  topCreators: AdminAffiliateTopCreatorRow[];
  topProjects: AdminAffiliateTopProjectRow[];
  shlinkConfigured: boolean;
  totalLinks: number;
  totalClicks: number | null;
};
