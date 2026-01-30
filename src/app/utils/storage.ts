import { CreatorProfile, AffiliateLink, Project } from '../types';
import { supabase } from './supabase';
import { verifyPassword } from './password';

// Helper function to generate UUID
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

// ===== Creator Profile Operations =====

export const saveCreator = async (creator: CreatorProfile): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: creator.id,
      email: creator.email,
      name: creator.name,
      phone: creator.phone,
      base_location: creator.baseLocation,
      province: creator.province,
      category: creator.category,
      followers: creator.followers,
      profile_image: creator.profileImage,
      social_accounts: creator.socialAccounts,
      follower_counts: creator.followerCounts,
      budgets: creator.budgets,
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

export const getCreators = async (): Promise<CreatorProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting Creators:', error);
    throw error;
  }

  return (data || []).map(mapDbToCreatorProfile);
};

export const getCreatorById = async (id: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by ID:', error);
    throw error;
  }

  return data ? mapDbToCreatorProfile(data) : null;
};

export const getCreatorByEmail = async (email: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by email:', error);
    throw error;
  }

  return data ? mapDbToCreatorProfile(data) : null;
};

// Helper function to map database row to CreatorProfile
const mapDbToCreatorProfile = (row: any): CreatorProfile => ({
  id: row.id,
  email: row.email || '',
  name: row.name || '',
  phone: row.phone || '',
  baseLocation: row.base_location || '',
  province: row.province,
  category: row.category || '',
  followers: row.followers || 0,
  profileImage: row.profile_image,
  socialAccounts: row.social_accounts || {},
  followerCounts: row.follower_counts || {},
  budgets: row.budgets || {},
  status: row.status || 'general',
  projectName: row.project_name,
  createdAt: row.created_at || new Date().toISOString(),
  facebookId: row.facebook_id,
  passwordHash: row.password_hash,
});

// ===== Authentication Operations =====

export const getCreatorByFacebookId = async (facebookId: string): Promise<CreatorProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('facebook_id', facebookId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error getting Creator by Facebook ID:', error);
    throw error;
  }

  return data ? mapDbToCreatorProfile(data) : null;
};

export const authenticateCreator = async (
  email: string,
  password: string
): Promise<CreatorProfile | null> => {
  const creator = await getCreatorByEmail(email);
  
  if (!creator || !creator.passwordHash) {
    return null; // User not found or registered via Facebook
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
      kol_id: link.creatorId,
      campaign_name: link.campaignName,
      project_id: link.projectId,
      url: link.url,
      created_at: link.createdAt
    });

  if (error) {
    console.error('Error saving affiliate link:', error);
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
    .eq('kol_id', creatorId)
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
  creatorId: row.kol_id,
  campaignName: row.campaign_name || '',
  projectId: row.project_id,
  url: row.url || '',
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
      base_url: project.baseUrl,
      created_at: project.createdAt
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
  baseUrl: row.base_url || '',
  createdAt: row.created_at || new Date().toISOString()
});

// ===== Current User Operations (still use localStorage for session) =====

export const setCurrentUser = (id: string, role: 'creator' | 'admin'): void => {
  localStorage.setItem('current_user', id);
  localStorage.setItem('user_role', role);
};

export const getCurrentUser = (): { id: string; role: 'creator' | 'admin' } | null => {
  const id = localStorage.getItem('current_user');
  const role = localStorage.getItem('user_role') as 'creator' | 'admin';
  
  return id && role ? { id, role } : null;
};

export const logout = (): void => {
  localStorage.removeItem('current_user');
  localStorage.removeItem('user_role');
};
