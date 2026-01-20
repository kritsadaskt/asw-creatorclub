import { KOLProfile, AffiliateLink } from '../types';

const STORAGE_KEYS = {
  KOLS: 'kol_profiles',
  AFFILIATES: 'affiliate_links',
  CURRENT_USER: 'current_user',
  USER_ROLE: 'user_role'
};

// KOL Profile operations
export const saveKOL = (kol: KOLProfile): void => {
  const kols = getKOLs();
  const index = kols.findIndex(k => k.id === kol.id);
  
  if (index >= 0) {
    kols[index] = kol;
  } else {
    kols.push(kol);
  }
  
  localStorage.setItem(STORAGE_KEYS.KOLS, JSON.stringify(kols));
};

export const getKOLs = (): KOLProfile[] => {
  const data = localStorage.getItem(STORAGE_KEYS.KOLS);
  return data ? JSON.parse(data) : [];
};

export const getKOLById = (id: string): KOLProfile | undefined => {
  return getKOLs().find(kol => kol.id === id);
};

export const getKOLByEmail = (email: string): KOLProfile | undefined => {
  return getKOLs().find(kol => kol.email === email);
};

// Affiliate Link operations
export const saveAffiliateLink = (link: AffiliateLink): void => {
  const links = getAffiliateLinks();
  links.push(link);
  localStorage.setItem(STORAGE_KEYS.AFFILIATES, JSON.stringify(links));
};

export const getAffiliateLinks = (): AffiliateLink[] => {
  const data = localStorage.getItem(STORAGE_KEYS.AFFILIATES);
  return data ? JSON.parse(data) : [];
};

export const getAffiliateLinksByKOL = (kolId: string): AffiliateLink[] => {
  return getAffiliateLinks().filter(link => link.kolId === kolId);
};

// Current user operations
export const setCurrentUser = (id: string, role: 'kol' | 'admin'): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, id);
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
};

export const getCurrentUser = (): { id: string; role: 'kol' | 'admin' } | null => {
  const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as 'kol' | 'admin';
  
  return id && role ? { id, role } : null;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
};
