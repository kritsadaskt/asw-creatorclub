import {
  CreatorProfile,
  CreatorTypeRow,
  ProfileAnalystAiResult,
  AffiliateLink,
  Project,
  Campaign,
  Event,
  EventParticipant,
  FgfLead,
  FgfLeadStatus,
  FgfLeadWithProjects,
} from '../types';
import { supabase } from './supabase';
import { verifyPassword } from './password';
import { getSession, setSession, clearSession } from './auth';
import { sanitizeSocialAccounts } from './social-url';
import {
  buildCreatorCategoryMaps,
  resolveIdsFromLabels,
  resolveThLabelsFromIds,
  type CreatorCategoryMaps,
  type CreatorCategoryRow,
} from './creatorCategoryLookup';

// Helper function to generate UUID
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

// ===== Project Image Upload Operations =====

export const uploadProjectImage = async (file: File, projectId: string): Promise<string> => {
  const bucket = 'uploads';

  const extension = file.name.split('.').pop() || 'jpg';
  const safeExtension = extension.toLowerCase();
  const path = `projects/${projectId}-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await supabase
    .storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || `image/${safeExtension}`,
    });

  if (uploadError) {
    console.error('Error uploading project image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);

  if (!data || !data.publicUrl) {
    throw new Error('Failed to get public URL for project image');
  }

  return data.publicUrl;
};

/** Fired after creator profile fields (e.g. image) are saved — Header listens to refresh avatar. */
export const CREATOR_PROFILE_UPDATED_EVENT = 'asw-creator-profile-updated';

/** Same bucket as `PROFILE_IMAGES_BUCKET` in facebook.ts */
const PROFILE_IMAGES_BUCKET = 'profile-images';

const CREATOR_PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CREATOR_PROFILE_IMAGE_ALLOWED = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function extensionForCreatorProfileImage(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) {
    if (fromName === 'jpeg' || fromName === 'jpg') return 'jpg';
    if (fromName === 'png') return 'png';
    if (fromName === 'webp') return 'webp';
    if (fromName === 'gif') return 'gif';
  }
  const t = file.type.toLowerCase();
  if (t === 'image/jpeg' || t === 'image/jpg') return 'jpg';
  if (t === 'image/png') return 'png';
  if (t === 'image/webp') return 'webp';
  if (t === 'image/gif') return 'gif';
  return 'jpg';
}

export const uploadCreatorProfileImage = async (
  file: File,
  creatorId: string,
): Promise<string> => {
  if (file.size > CREATOR_PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('CREATOR_PROFILE_IMAGE_TOO_LARGE');
  }
  const mime = file.type.toLowerCase();
  if (!mime || !CREATOR_PROFILE_IMAGE_ALLOWED.has(mime)) {
    throw new Error('CREATOR_PROFILE_IMAGE_INVALID_TYPE');
  }

  const ext = extensionForCreatorProfileImage(file);
  const path = `creators/${creatorId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext}`,
  });

  if (uploadError) {
    console.error('Error uploading creator profile image:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Failed to get public URL for creator profile image');
  }

  return data.publicUrl;
};

// ===== Creator Profile Operations =====

function shouldUseUatProfilesTable(): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

const CREATOR_PROFILES_TABLE = shouldUseUatProfilesTable() ? 'profiles_uat' : 'profiles';

let creatorCategoryMapsCache: CreatorCategoryMaps | null = null;
let creatorCategoryMapsPromise: Promise<CreatorCategoryMaps> | null = null;

/** Clears cached `creator_categories` maps (e.g. after admin edits categories in DB). */
export function invalidateCreatorCategoryLookupCache(): void {
  creatorCategoryMapsCache = null;
  creatorCategoryMapsPromise = null;
}

async function getCreatorCategoryMaps(): Promise<CreatorCategoryMaps> {
  if (creatorCategoryMapsCache) return creatorCategoryMapsCache;
  if (!creatorCategoryMapsPromise) {
    creatorCategoryMapsPromise = (async () => {
      const { data, error } = await supabase
        .from('creator_categories')
        .select('id,th_label,en_label')
        .eq('is_active', true)
        .order('id', { ascending: true });
      if (error) throw error;
      creatorCategoryMapsCache = buildCreatorCategoryMaps((data ?? []) as CreatorCategoryRow[]);
      return creatorCategoryMapsCache;
    })();
  }
  return creatorCategoryMapsPromise;
}

function enrichCreatorWithCategoryMaps(profile: CreatorProfile, maps: CreatorCategoryMaps): CreatorProfile {
  let categoryIds = [...profile.categoryIds];
  let categories = [...profile.categories];

  if (categoryIds.length === 0 && categories.length > 0) {
    categoryIds = resolveIdsFromLabels(categories, maps);
  }
  if (categoryIds.length > 0) {
    categories = resolveThLabelsFromIds(categoryIds, maps);
  }

  return { ...profile, categoryIds, categories };
}

export async function enrichCreatorProfile(profile: CreatorProfile): Promise<CreatorProfile> {
  const maps = await getCreatorCategoryMaps();
  return enrichCreatorWithCategoryMaps(profile, maps);
}

export async function enrichCreatorProfiles(profiles: CreatorProfile[]): Promise<CreatorProfile[]> {
  if (profiles.length === 0) return [];
  const maps = await getCreatorCategoryMaps();
  return profiles.map((p) => enrichCreatorWithCategoryMaps(p, maps));
}

/** Active creator invite / segment types (`creator_type` table). */
export const getCreatorTypes = async (): Promise<CreatorTypeRow[]> => {
  const { data, error } = await supabase
    .from('creator_type')
    .select('id,key,name_th,name_en,registration_flow')
    .order('id', { ascending: true });

  if (error) {
    console.error('getCreatorTypes:', error);
    throw error;
  }

  return (data ?? []).map(
    (row: {
      id: number;
      key: string;
      name_th?: string | null;
      name_en?: string | null;
      registration_flow?: string | null;
    }) => {
      const rf = row.registration_flow;
      const registrationFlow =
        rf === 'standard' || rf === 'household' || rf === 'pageant' ? rf : null;
      return {
        id: row.id,
        key: (row.key ?? '').trim(),
        nameTh: (row.name_th ?? '').trim(),
        nameEn: (row.name_en ?? '').trim(),
        registrationFlow,
      };
    },
  );
};

export const saveCreator = async (creator: CreatorProfile): Promise<void> => {
  const maps = await getCreatorCategoryMaps();
  let categoryIds =
    creator.categoryIds.length > 0 ? creator.categoryIds : resolveIdsFromLabels(creator.categories ?? [], maps);
  let thLabels =
    categoryIds.length > 0 ? resolveThLabelsFromIds(categoryIds, maps) : (creator.categories ?? []).map((s) => s.trim()).filter(Boolean);

  const { error } = await supabase
    .from(CREATOR_PROFILES_TABLE)
    .upsert({
      id: creator.id,
      email: creator.email,
      name: creator.name,
      lastname: creator.lastName,
      dob: creator.dob,
      phone: creator.phone,
      base_location: creator.baseLocation,
      province: creator.province,
      type: creator.type,
      pageant_year: creator.pageantYear ?? null,
      category: thLabels.length > 0 ? thLabels[0] : null,
      categories: thLabels,
      category_ids: categoryIds,
      followers: creator.followers,
      profile_image: creator.profileImage,
      social_accounts: sanitizeSocialAccounts(creator.socialAccounts),
      follower_counts: creator.followerCounts,
      budget_per_post:
        typeof creator.budget === 'number' && Number.isFinite(creator.budget) ? creator.budget : null,
      approval_status: creator.approvalStatus ?? 3,
      status: creator.status,
      project_name: creator.projectName,
      created_at: creator.createdAt,
      role: 'creator',  // Required by profiles_role_check constraint (allowed: 'creator', 'admin')
      facebook_id: creator.facebookId,
      password_hash: creator.passwordHash,
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving Creator:', error);
    throw error;
  }
};

const normalizeCreatorBudget = (raw: unknown): number | undefined => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

export const getCreators = async (): Promise<CreatorProfile[]> => {
  const { data, error } = await supabase
    .from(CREATOR_PROFILES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting Creators:', error);
    throw error;
  }

  return enrichCreatorProfiles((data || []).map(mapDbToCreatorProfile));
};

export const getCreatorById = async (id: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from(CREATOR_PROFILES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by ID:', error);
    throw error;
  }

  return data ? enrichCreatorProfile(mapDbToCreatorProfile(data)) : null;
};

export const getCreatorByEmail = async (email: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from(CREATOR_PROFILES_TABLE)
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by email:', error);
    throw error;
  }

  return data ? enrichCreatorProfile(mapDbToCreatorProfile(data)) : null;
};

function normalizeProfileAnalystAi(obj: Record<string, unknown>): ProfileAnalystAiResult | undefined {
  const categories = Array.isArray(obj.categories)
    ? obj.categories.filter((x): x is string => typeof x === 'string')
    : [];
  const overall_quality_score =
    typeof obj.overall_quality_score === 'number' && !Number.isNaN(obj.overall_quality_score)
      ? obj.overall_quality_score
      : 0;
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : '';
  const content_style = typeof obj.content_style === 'string' ? obj.content_style : '';
  const audience_fit = typeof obj.audience_fit === 'string' ? obj.audience_fit : '';
  const recommendation = typeof obj.recommendation === 'string' ? obj.recommendation : '';

  const platform_scores: ProfileAnalystAiResult['platform_scores'] = {};
  const rawPlatforms = obj.platform_scores;
  if (rawPlatforms && typeof rawPlatforms === 'object' && !Array.isArray(rawPlatforms)) {
    for (const [k, v] of Object.entries(rawPlatforms as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const pv = v as Record<string, unknown>;
        const score = typeof pv.score === 'number' && !Number.isNaN(pv.score) ? pv.score : 0;
        const summary = typeof pv.summary === 'string' ? pv.summary : '';
        platform_scores[k] = { score, summary };
      }
    }
  }

  const hasContent =
    categories.length > 0 ||
    typeof obj.overall_quality_score === 'number' ||
    reasoning.trim() !== '' ||
    Object.keys(platform_scores).length > 0 ||
    content_style.trim() !== '' ||
    audience_fit.trim() !== '' ||
    recommendation.trim() !== '';

  if (!hasContent) return undefined;

  return {
    categories,
    overall_quality_score,
    reasoning,
    platform_scores,
    content_style,
    audience_fit,
    recommendation,
  };
}

function profileAnalystFieldsFromRow(
  raw: unknown,
): Pick<CreatorProfile, 'profileAnalyst' | 'profileAnalystLegacyText'> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const normalized = normalizeProfileAnalystAi(parsed as Record<string, unknown>);
        if (normalized) return { profileAnalyst: normalized };
      }
    } catch {
      /* legacy plain text */
    }
    return { profileAnalystLegacyText: s };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const normalized = normalizeProfileAnalystAi(raw as Record<string, unknown>);
    if (normalized) return { profileAnalyst: normalized };
  }
  return {};
}

// Helper function to map database row to CreatorProfile
const mapDbToCreatorProfile = (row: any): CreatorProfile => {
  const analyst = profileAnalystFieldsFromRow(row.profile_analyst);
  return {
    id: row.id,
    email: row.email || '',
    name: row.name || '',
    lastName: row.lastname || undefined,
    dob: row.dob || undefined,
    phone: row.phone || '',
    baseLocation: row.base_location || '',
    province: row.province,
    categoryIds: Array.isArray(row.category_ids)
      ? row.category_ids.filter((x: unknown): x is string => typeof x === 'string')
      : [],
    categories: Array.isArray(row.categories)
      ? row.categories.filter((x: unknown): x is string => typeof x === 'string')
      : row.category
        ? [String(row.category)]
        : [],
    followers: row.followers || 0,
    profileImage: row.profile_image,
    socialAccounts: sanitizeSocialAccounts(row.social_accounts || {}),
    followerCounts: row.follower_counts || {},
    budget: normalizeCreatorBudget(row.budget_per_post),
    approvalStatus: typeof row.approval_status === 'number' ? (row.approval_status as 0 | 1 | 2 | 3) : 3,
    status: row.status || 'general',
    projectName: row.project_name,
    type: row.type || undefined,
    pageantYear:
      row.pageant_year != null && row.pageant_year !== '' && Number.isFinite(Number(row.pageant_year))
        ? Number(row.pageant_year)
        : undefined,
    createdAt: row.created_at || new Date().toISOString(),
    facebookId: row.facebook_id,
    passwordHash: row.password_hash,
    isAdmin: Boolean(row.is_admin),
    isMkt: Boolean(row.is_mkt),
    ...analyst,
  };
};

// ===== Authentication Operations =====

export const getCreatorByFacebookId = async (facebookId: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from(CREATOR_PROFILES_TABLE)
    .select('*')
    .eq('facebook_id', facebookId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by Facebook ID:', error);
    throw error;
  }

  return data ? enrichCreatorProfile(mapDbToCreatorProfile(data)) : null;
};

export const authenticateCreator = async (
  email: string,
  password: string
): Promise<CreatorProfile | null> => {
  const creator = await getCreatorByEmail(email);
  
  if (!creator || !creator.passwordHash) {
    return null; // User not found or registered via Facebook
  }
  if (creator.approvalStatus === 0) {
    return null; // Rejected users cannot login
  }

  const isValid = await verifyPassword(password, creator.passwordHash);
  return isValid ? creator : null;
};

// ===== Affiliate Link Operations =====

export const saveAffiliateLink = async (link: AffiliateLink): Promise<void> => {
  const { error } = await supabase
    .from('affiliate_links')
    .insert({
      id: link.id,
      creator_id: link.creatorId,
      campaign_name: link.campaignName,
      project_id: link.projectId,
      campaign_id: link.campaignId,
      url: link.url,
      post_links: link.postLinks ?? [],
      created_at: link.createdAt
    });

  if (error) {
    console.error('Error saving affiliate link:', error);
    throw error;
  }
};

/** Inserts only if this creator has no row with the same URL yet (trimmed). */
export const saveAffiliateLinkIfUrlNewForCreator = async (params: {
  creatorId: string;
  url: string;
  projectId: string;
  campaignName: string;
  campaignId?: string;
}): Promise<void> => {
  const normalizedUrl = params.url.trim();
  if (!normalizedUrl) return;

  const { data: existing, error: selectError } = await supabase
    .from('affiliate_links')
    .select('id')
    .eq('creator_id', params.creatorId)
    .eq('url', normalizedUrl)
    .maybeSingle();

  if (selectError) {
    console.error('Error checking affiliate link duplicate:', selectError);
    throw selectError;
  }
  if (existing) return;

  await saveAffiliateLink({
    id: generateUUID(),
    creatorId: params.creatorId,
    campaignName: params.campaignName,
    projectId: params.projectId,
    campaignId: params.campaignId,
    url: normalizedUrl,
    postLinks: [],
    createdAt: new Date().toISOString(),
  });
};

export const updateAffiliateLink = async (link: AffiliateLink): Promise<void> => {
  const { error } = await supabase
    .from('affiliate_links')
    .update({
      campaign_name: link.campaignName,
      project_id: link.projectId ?? null,
      campaign_id: link.campaignId ?? null,
      url: link.url,
      post_links: link.postLinks ?? [],
    })
    .eq('id', link.id)
    .eq('creator_id', link.creatorId);

  if (error) {
    console.error('Error updating affiliate link:', error);
    throw error;
  }
};

export const getAffiliateLinks = async (): Promise<AffiliateLink[]> => {
  const { data, error } = await supabase
    .from('affiliate_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting affiliate links:', error);
    throw error;
  }

  return (data || []).map(mapDbToAffiliateLink);
};

export const getAffiliateLinksByCreator = async (creatorId: string): Promise<AffiliateLink[]> => {
  const { data, error } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting affiliate links by Creator:', error);
    throw error;
  }

  return (data || []).map(mapDbToAffiliateLink);
};

// Helper function to map database row to AffiliateLink
const mapDbToAffiliateLink = (row: any): AffiliateLink => ({
  id: row.id,
  creatorId: row.creator_id,
  campaignName: row.campaign_name || '',
  projectId: row.project_id,
  campaignId: row.campaign_id,
  url: row.url || '',
  postLinks: Array.isArray(row.post_links)
    ? row.post_links.filter((item: unknown): item is string => typeof item === 'string')
    : [],
  createdAt: row.created_at || new Date().toISOString()
});

// ===== Project Operations =====

export const saveProject = async (project: Project): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      name: project.name,
      type: project.type,
      location: project.location,
      description: project.description,
      image_url: project.imageUrl,
      thumb_url: project.thumbUrl,
      google_drive_url: project.googleDriveUrl,
      google_drive_password: project.googleDrivePassword,
      project_status: project.projectStatus,
      start_comm: project.startComm,
      max_comm: project.maxComm,
      base_url: project.baseUrl,
      created_at: project.createdAt,
      cis_id: project.cisId ?? null,
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting projects:', error);
    throw error;
  }

  return (data || []).map(mapDbToProject);
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting project by ID:', error);
    throw error;
  }

  return data ? mapDbToProject(data) : null;
};

/** Resolve app project UUIDs to CIS integer ProjectIDs (`projects.cis_id`). Omits rows with null/missing cis_id. */
export const getProjectCisIdsByIds = async (projectIds: string[]): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (projectIds.length === 0) return map;

  const { data, error } = await supabase
    .from('projects')
    .select('id, cis_id')
    .in('id', projectIds);

  if (error) {
    console.error('Error loading project cis_id:', error);
    throw error;
  }

  for (const row of data || []) {
    const cid = row.cis_id;
    if (cid != null && Number.isFinite(Number(cid))) {
      map.set(row.id as string, Number(cid));
    }
  }
  return map;
};

/** Resolve CIS ProjectIDs (`projects.cis_id`) to app UUIDs for `fgf_lead_projects`. First row wins if duplicates exist. */
export const getProjectIdsByCisIds = async (cisIds: number[]): Promise<Map<number, string>> => {
  const map = new Map<number, string>();
  const finite = cisIds.filter((n) => Number.isFinite(n) && n > 0);
  if (finite.length === 0) return map;

  const { data, error } = await supabase
    .from('projects')
    .select('id, cis_id')
    .in('cis_id', finite);

  if (error) {
    console.error('Error loading projects by cis_id:', error);
    throw error;
  }

  for (const row of data || []) {
    const cid = row.cis_id;
    if (cid != null && Number.isFinite(Number(cid))) {
      const n = Number(cid);
      if (!map.has(n)) {
        map.set(n, row.id as string);
      }
    }
  }
  return map;
};

export const deleteProject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Helper function to map database row to Project
const mapDbToProject = (row: any): Project => ({
  id: row.id,
  name: row.name || '',
  type: row.type || 'condo',
  location: row.location || '',
  description: row.description,
  imageUrl: row.image_url || undefined,
  thumbUrl: row.thumb_url || undefined,
  googleDriveUrl: row.google_drive_url || undefined,
  googleDrivePassword: row.google_drive_password || undefined,
  projectStatus: row.project_status ?? undefined,
  startComm: row.start_comm || undefined,
  maxComm: row.max_comm || undefined,
  baseUrl: row.base_url || '',
  createdAt: row.created_at || new Date().toISOString(),
  cisId: row.cis_id != null && Number.isFinite(Number(row.cis_id)) ? Number(row.cis_id) : undefined,
});

// ===== Campaign Operations =====

export const saveCampaign = async (campaign: Campaign): Promise<void> => {
  const { error } = await supabase
    .from('campaigns')
    .upsert({
      id: campaign.id,
      name: campaign.name,
      sub_title: campaign.subTitle ?? null,
      detail: campaign.detail,
      promotion_img: campaign.promotionImg,
      banner_desktop_url: campaign.bannerDesktopUrl,
      banner_mobile_url: campaign.bannerMobileUrl,
      campaign_key: campaign.campaignKey,
      lead_target: campaign.leadTarget,
      budget: campaign.budget,
      utm_source: campaign.utmSource,
      utm_medium: campaign.utmMedium,
      utm_id: campaign.utmId,
      utm_campaign: campaign.utmCampaign,
      landing_url: campaign.landingUrl,
      materials_url: campaign.materialsUrl ?? null,
      terms_url: campaign.termsUrl ?? null,
      project_ids: campaign.projectIds,
      start_at: campaign.startAt ?? null,
      end_at: campaign.endAt ?? null,
      is_active: campaign.isActive ?? true,
      created_at: campaign.createdAt
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving campaign:', error);
    throw error;
  }
};

export const getCampaigns = async (): Promise<Campaign[]> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting campaigns:', error);
    throw error;
  }

  return (data || []).map(mapDbToCampaign);
};

export const getCampaignById = async (id: string): Promise<Campaign | null> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting campaign by ID:', error);
    throw error;
  }

  return data ? mapDbToCampaign(data) : null;
};

export const getCampaignByKey = async (campaignKey: string): Promise<Campaign | null> => {
  const normalizedKey = campaignKey.trim().toLowerCase();
  if (!normalizedKey) return null;
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('campaign_key', normalizedKey)
    .maybeSingle();

  if (error) {
    console.error('Error getting campaign by key:', error);
    throw error;
  }

  return data ? mapDbToCampaign(data) : null;
};

export const getActiveCampaigns = async (atIso?: string): Promise<Campaign[]> => {
  const nowIso = atIso ?? new Date().toISOString();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting active campaigns:', error);
    throw error;
  }

  return (data || [])
    .map(mapDbToCampaign)
    .filter((campaign) => {
      const startsOk = !campaign.startAt || campaign.startAt <= nowIso;
      const endsOk = !campaign.endAt || campaign.endAt >= nowIso;
      return startsOk && endsOk;
    });
};

export const getCampaignsByProjectId = async (projectId: string): Promise<Campaign[]> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .contains('project_ids', [projectId])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting campaigns by project ID:', error);
    throw error;
  }

  return (data || []).map(mapDbToCampaign);
};

export const deleteCampaign = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
};

export const deactivateCampaign = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('campaigns')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deactivating campaign:', error);
    throw error;
  }
};

export type CampaignReportBasic = {
  campaignId: string;
  linkCount: number;
  creatorCount: number;
  projectCount: number;
};

export const getCampaignReportsBasic = async (campaignIds: string[]): Promise<Map<string, CampaignReportBasic>> => {
  const reportMap = new Map<string, CampaignReportBasic>();
  if (campaignIds.length === 0) return reportMap;
  const uniqueIds = Array.from(new Set(campaignIds));
  const { data, error } = await supabase
    .from('affiliate_links')
    .select('campaign_id, creator_id, project_id')
    .in('campaign_id', uniqueIds);

  if (error) {
    console.error('Error getting campaign basic reports:', error);
    throw error;
  }

  const creatorSets = new Map<string, Set<string>>();
  const projectSets = new Map<string, Set<string>>();
  const linkCounts = new Map<string, number>();

  for (const row of data || []) {
    const campaignId = typeof row.campaign_id === 'string' ? row.campaign_id : '';
    if (!campaignId) continue;
    linkCounts.set(campaignId, (linkCounts.get(campaignId) ?? 0) + 1);
    if (typeof row.creator_id === 'string' && row.creator_id) {
      const set = creatorSets.get(campaignId) ?? new Set<string>();
      set.add(row.creator_id);
      creatorSets.set(campaignId, set);
    }
    if (typeof row.project_id === 'string' && row.project_id) {
      const set = projectSets.get(campaignId) ?? new Set<string>();
      set.add(row.project_id);
      projectSets.set(campaignId, set);
    }
  }

  for (const campaignId of uniqueIds) {
    reportMap.set(campaignId, {
      campaignId,
      linkCount: linkCounts.get(campaignId) ?? 0,
      creatorCount: creatorSets.get(campaignId)?.size ?? 0,
      projectCount: projectSets.get(campaignId)?.size ?? 0,
    });
  }

  return reportMap;
};

// ===== Event Operations =====

const mapDbToEvent = (row: any): Event => ({
  id: row.id,
  createdAt: row.created_at || new Date().toISOString(),
  name: row.name || '',
  date: row.date || '',
  desc: row.desc || undefined,
  dBanner: row.d_banner || undefined,
  mBanner: row.m_banner || undefined,
  location: row.location || undefined,
  locationMapUrl: row.location_map_url || undefined,
  isActive: row.is_active !== false,
});

export const getEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting events:', error);
    throw error;
  }

  return (data || []).map(mapDbToEvent);
};

/**
 * Returns the current event for registration flow.
 * Rule: pick nearest event from today onward; fallback to latest historical event.
 */
export const getCurrentEvent = async (): Promise<Event | null> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: upcoming, error: upcomingError } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (upcomingError) {
    console.error('Error getting upcoming event:', upcomingError);
    throw upcomingError;
  }
  if (upcoming) return mapDbToEvent(upcoming);

  const { data: latest, error: latestError } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error('Error getting latest event:', latestError);
    throw latestError;
  }

  return latest ? mapDbToEvent(latest) : null;
};

export const saveEvent = async (event: Event): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .upsert(
      {
        id: event.id,
        created_at: event.createdAt,
        name: event.name,
        date: event.date,
        desc: event.desc ?? null,
        d_banner: event.dBanner ?? null,
        m_banner: event.mBanner ?? null,
        location: event.location ?? null,
        location_map_url: event.locationMapUrl ?? null,
        is_active: event.isActive ?? true,
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('Error saving event:', error);
    throw error;
  }
};

export const deleteEvent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// ===== Event Participant Operations =====

const mapDbToEventParticipant = (row: any): EventParticipant => ({
  id: row.id,
  eventId: row.event_id,
  creatorId: row.creator_id,
  isShowup: Boolean(row.is_showup),
  isConfirm: Boolean(row.is_confirm),
  submitAt: row.submit_at || new Date().toISOString(),
});

export const getEventParticipants = async (): Promise<EventParticipant[]> => {
  const { data, error } = await supabase
    .from('event_participant')
    .select('*')
    .order('submit_at', { ascending: false });

  if (error) {
    console.error('Error getting event participants:', error);
    throw error;
  }

  return (data || []).map(mapDbToEventParticipant);
};

export const saveEventParticipant = async (participant: EventParticipant): Promise<void> => {
  const { error } = await supabase
    .from('event_participant')
    .upsert(
      {
        id: participant.id,
        event_id: participant.eventId,
        creator_id: participant.creatorId,
        is_showup: participant.isShowup,
        is_confirm: participant.isConfirm,
        submit_at: participant.submitAt,
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('Error saving event participant:', error);
    throw error;
  }
};

export const updateEventParticipant = async (
  id: string,
  patch: Partial<Pick<EventParticipant, 'isShowup' | 'isConfirm' | 'submitAt'>>,
): Promise<void> => {
  const payload: Record<string, unknown> = {};
  if (patch.isShowup !== undefined) payload.is_showup = patch.isShowup;
  if (patch.isConfirm !== undefined) payload.is_confirm = patch.isConfirm;
  if (patch.submitAt !== undefined) payload.submit_at = patch.submitAt;

  const { error } = await supabase
    .from('event_participant')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Error updating event participant:', error);
    throw error;
  }
};

export const deleteEventParticipant = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('event_participant')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting event participant:', error);
    throw error;
  }
};

export const getCreatorEventParticipation = async (
  eventId: string,
  creatorId: string,
): Promise<EventParticipant | null> => {
  const { data, error } = await supabase
    .from('event_participant')
    .select('*')
    .eq('event_id', eventId)
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (error) {
    console.error('Error getting creator event participation:', error);
    throw error;
  }

  return data ? mapDbToEventParticipant(data) : null;
};

export const joinCurrentEvent = async (
  eventId: string,
  creatorId: string,
): Promise<{ created: boolean; participant: EventParticipant }> => {
  const existing = await getCreatorEventParticipation(eventId, creatorId);
  if (existing) {
    return { created: false, participant: existing };
  }

  const newRow: EventParticipant = {
    id: generateUUID(),
    eventId,
    creatorId,
    isShowup: false,
    isConfirm: false,
    submitAt: new Date().toISOString(),
  };

  await saveEventParticipant(newRow);
  return { created: true, participant: newRow };
};

export const checkInConfirmedEventParticipant = async (params: {
  eventId: string;
  creatorId: string;
}): Promise<{ ok: boolean; reason?: 'NOT_FOUND_OR_NOT_CONFIRMED' | 'ALREADY_CHECKED_IN' }> => {
  const { data, error } = await supabase
    .from('event_participant')
    .select('id, is_showup')
    .eq('event_id', params.eventId)
    .eq('creator_id', params.creatorId)
    .eq('is_confirm', true)
    .maybeSingle();

  if (error) {
    console.error('Error checking confirmed participant:', error);
    throw error;
  }
  if (!data) {
    return { ok: false, reason: 'NOT_FOUND_OR_NOT_CONFIRMED' };
  }
  if (Boolean(data.is_showup)) {
    return { ok: false, reason: 'ALREADY_CHECKED_IN' };
  }

  const { error: updateError } = await supabase
    .from('event_participant')
    .update({ is_showup: true })
    .eq('id', data.id);

  if (updateError) {
    console.error('Error updating check-in status:', updateError);
    throw updateError;
  }

  return { ok: true };
};

// ===== Friend Get Friends Lead Operations =====

export type CreateFgfLeadInput = {
  referrerName: string;
  referrerLastName: string;
  referrerEmail: string;
  referrerTel: string;
  /** Current user id for reference when defined (DB column `ref_uid`). */
  refUid?: string;
  referrerCreatorId?: string;
  leadName: string;
  leadLastName: string;
  leadEmail: string;
  leadTel: string;
  projectIds: string[];
};

const mapDbToFgfLead = (row: any): FgfLead => ({
  id: row.id,
  referrerName: row.referrer_name || '',
  referrerLastName: row.referrer_last_name || '',
  referrerEmail: row.referrer_email || '',
  referrerTel: row.referrer_tel || '',
  refUid: row.ref_uid || undefined,
  referrerCreatorId: row.referrer_creator_id || undefined,
  leadName: row.lead_name || '',
  leadLastName: row.lead_last_name || '',
  leadEmail: row.lead_email || '',
  leadTel: row.lead_tel || '',
  status: (row.status || 'new') as FgfLeadStatus,
  chosenProjectId: row.chosen_project_id || undefined,
  uploadedToCrm: !!row.uploaded_to_crm,
  uploadedAt: row.uploaded_at || undefined,
  uploadedBy: row.uploaded_by || undefined,
  crmResponse: row.crm_response ?? undefined,
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

const getFgfLeadProjectIds = async (leadIds: string[]): Promise<Record<string, string[]>> => {
  if (leadIds.length === 0) return {};
  const { data, error } = await supabase
    .from('fgf_lead_projects')
    .select('fgf_lead_id, project_id')
    .in('fgf_lead_id', leadIds);

  if (error) {
    console.error('Error getting FGF lead projects:', error);
    throw error;
  }

  const grouped: Record<string, string[]> = {};
  (data || []).forEach((row: any) => {
    if (!grouped[row.fgf_lead_id]) grouped[row.fgf_lead_id] = [];
    grouped[row.fgf_lead_id].push(row.project_id);
  });
  return grouped;
};

export const createFgfLeadWithProjects = async (
  input: CreateFgfLeadInput
): Promise<FgfLeadWithProjects> => {
  const uniqueProjectIds = Array.from(
    new Set(input.projectIds.filter((projectId) => !!projectId))
  );

  if (uniqueProjectIds.length === 0) {
    throw new Error('At least one project is required');
  }

  // Duplicate detection: same lead_email + lead_tel within 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('fgf_leads')
    .select('id')
    .eq('lead_email', input.leadEmail)
    .eq('lead_tel', input.leadTel)
    .gte('created_at', cutoff)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error('DUPLICATE_LEAD');
  }

  const initialChosenProjectId = uniqueProjectIds.length === 1 ? uniqueProjectIds[0] : null;
  const initialStatus: FgfLeadStatus = uniqueProjectIds.length === 1 ? 'verified' : 'new';

  const { data, error } = await supabase
    .from('fgf_leads')
    .insert({
      referrer_name: input.referrerName,
      referrer_last_name: input.referrerLastName,
      referrer_email: input.referrerEmail,
      referrer_tel: input.referrerTel,
      ref_uid: input.refUid ?? null,
      referrer_creator_id: input.referrerCreatorId ?? null,
      lead_name: input.leadName,
      lead_last_name: input.leadLastName,
      lead_email: input.leadEmail,
      lead_tel: input.leadTel,
      status: initialStatus,
      chosen_project_id: initialChosenProjectId,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating FGF lead:', error);
    throw error ?? new Error('Failed to create FGF lead');
  }

  const { error: projectInsertError } = await supabase
    .from('fgf_lead_projects')
    .insert(
      uniqueProjectIds.map((projectId) => ({
        fgf_lead_id: data.id,
        project_id: projectId,
      }))
    );

  if (projectInsertError) {
    console.error('Error creating FGF lead project mappings:', projectInsertError);
    throw projectInsertError;
  }

  return {
    lead: mapDbToFgfLead(data),
    projectIds: uniqueProjectIds,
  };
};

export const getFgfLeadsWithProjects = async (): Promise<FgfLeadWithProjects[]> => {
  const { data, error } = await supabase
    .from('fgf_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting FGF leads:', error);
    throw error;
  }

  const leads = (data || []).map(mapDbToFgfLead);
  const projectMap = await getFgfLeadProjectIds(leads.map((lead) => lead.id));

  return leads.map((lead) => ({
    lead,
    projectIds: projectMap[lead.id] || [],
  }));
};

export const getFgfLeadByIdWithProjects = async (
  fgfLeadId: string
): Promise<FgfLeadWithProjects | null> => {
  const { data, error } = await supabase
    .from('fgf_leads')
    .select('*')
    .eq('id', fgfLeadId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting FGF lead by ID:', error);
    throw error;
  }

  const lead = mapDbToFgfLead(data);
  const projectMap = await getFgfLeadProjectIds([lead.id]);
  return {
    lead,
    projectIds: projectMap[lead.id] || [],
  };
};

export const updateFgfLeadStatusAndChoice = async (
  fgfLeadId: string,
  payload: {
    status?: FgfLeadStatus;
    chosenProjectId?: string | null;
    uploadedToCrm?: boolean;
    uploadedAt?: string | null;
    uploadedBy?: string | null;
    crmResponse?: unknown;
  }
): Promise<void> => {
  const patch: Record<string, unknown> = {};
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.chosenProjectId !== undefined) patch.chosen_project_id = payload.chosenProjectId;
  if (payload.uploadedToCrm !== undefined) patch.uploaded_to_crm = payload.uploadedToCrm;
  if (payload.uploadedAt !== undefined) patch.uploaded_at = payload.uploadedAt;
  if (payload.uploadedBy !== undefined) patch.uploaded_by = payload.uploadedBy;
  if (payload.crmResponse !== undefined) patch.crm_response = payload.crmResponse;

  const { error } = await supabase.from('fgf_leads').update(patch).eq('id', fgfLeadId);

  if (error) {
    console.error('Error updating FGF lead:', error);
    throw error;
  }
};

// Helper function to map database row to Campaign
const mapDbToCampaign = (row: any): Campaign => ({
  id: row.id,
  name: row.name || '',
  subTitle: row.sub_title || undefined,
  detail: row.detail || '',
  promotionImg: row.promotion_img,
  bannerDesktopUrl: row.banner_desktop_url || undefined,
  bannerMobileUrl: row.banner_mobile_url || undefined,
  campaignKey: row.campaign_key || undefined,
  leadTarget: row.lead_target || '',
  budget: row.budget || 0,
  utmSource: row.utm_source || '',
  utmMedium: row.utm_medium || '',
  utmId: row.utm_id || '',
  utmCampaign: row.utm_campaign || '',
  landingUrl: row.landing_url || '',
  materialsUrl: row.materials_url || undefined,
  termsUrl: row.terms_url || undefined,
  projectIds: row.project_ids || [],
  startAt: row.start_at || undefined,
  endAt: row.end_at || undefined,
  isActive: row.is_active ?? true,
  createdAt: row.created_at || new Date().toISOString()
});

// ===== Current User Operations (still use localStorage for session) =====

export const setCurrentUser = (id: string, role: 'creator' | 'admin' | 'marketing'): void => {
  setSession({ id, role });
};

export const getCurrentUser = (): { id: string; role: 'creator' | 'admin' | 'marketing' } | null => {
  const session = getSession();
  return session ? { id: session.id, role: session.role } : null;
};

export const logout = (): void => {
  clearSession();
};

// ===== Affiliate Materials Operations =====

export const saveAffiliateMaterial = async (material: import('../types').AffiliateMaterial): Promise<void> => {
  const { error } = await supabase
    .from('affiliate_materials')
    .upsert({
      id:          material.id,
      project_id:  material.projectId ?? null,
      title:       material.title,
      description: material.description ?? null,
      file_url:    material.fileUrl,
      file_type:   material.fileType,
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving affiliate material:', error);
    throw error;
  }
};

export const getAffiliateMaterials = async (
  opts?: { limit?: number; offset?: number }
): Promise<{ data: import('../types').AffiliateMaterial[]; count: number }> => {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const { data, error, count } = await supabase
    .from('affiliate_materials')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching affiliate materials:', error);
    throw error;
  }

  return {
    data: (data ?? []).map((row) => ({
      id:          row.id,
      projectId:   row.project_id ?? undefined,
      title:       row.title,
      description: row.description ?? undefined,
      fileUrl:     row.file_url,
      fileType:    row.file_type as 'image' | 'pdf' | 'video',
      createdAt:   row.created_at,
      updatedAt:   row.updated_at,
      s3Key:       row.s3_key ?? undefined,
    })),
    count: count ?? 0,
  };
};

export const updateAffiliateMaterial = async (
  id: string,
  patch: Partial<Pick<import('../types').AffiliateMaterial, 'title' | 'description' | 'projectId'>>
): Promise<import('../types').AffiliateMaterial> => {
  const updates: Record<string, unknown> = {};
  if (patch.title !== undefined) updates.title = patch.title;
  if ('description' in patch) updates.description = patch.description ?? null;
  if ('projectId' in patch) updates.project_id = patch.projectId ?? null;

  const { data, error } = await supabase
    .from('affiliate_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating affiliate material:', error);
    throw error;
  }

  return {
    id:          data.id,
    projectId:   data.project_id ?? undefined,
    title:       data.title,
    description: data.description ?? undefined,
    fileUrl:     data.file_url,
    fileType:    data.file_type as 'image' | 'pdf' | 'video',
    createdAt:   data.created_at,
    updatedAt:   data.updated_at ?? undefined,
    s3Key:       data.s3_key ?? undefined,
  };
};

export const getAffiliateMaterialsByProject = async (
  projectId: string
): Promise<import('../types').AffiliateMaterial[]> => {
  const { data, error } = await supabase
    .from('affiliate_materials')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate materials by project:', error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id:          row.id,
    projectId:   row.project_id ?? undefined,
    title:       row.title,
    description: row.description ?? undefined,
    fileUrl:     row.file_url,
    fileType:    row.file_type as 'image' | 'pdf' | 'video',
    createdAt:   row.created_at,
  }));
};

export const deleteAffiliateMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('affiliate_materials')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting affiliate material:', error);
    throw error;
  }
};

