'use client';

import { supabase } from './supabase';
import { getCreatorByEmail } from './storage';

export type AdminMarketingLoginResult =
  | { status: 'ok'; id: string; role: 'admin' | 'marketing'; name: string }
  | { status: 'auth_failed' }
  | { status: 'forbidden'; message: string };

/**
 * Authenticate with Supabase Auth, then derive dashboard role from profiles flags.
 * - admin: is_admin=true (takes priority when both flags are true)
 * - marketing: is_admin=false and is_mkt=true (reserved for future policy)
 * Any other flag combination is rejected for this login path.
 */
export async function loginAdminOrMarketingWithSupabase(
  email: string,
  password: string,
): Promise<AdminMarketingLoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { status: 'auth_failed' };
  }

  const profile = await getCreatorByEmail(email).catch(() => null);
  const isAdmin = Boolean(profile?.isAdmin);
  const isMkt = Boolean(profile?.isMkt);

  if (!isAdmin) {
    await supabase.auth.signOut();
    return {
      status: 'forbidden',
      message: 'บัญชีนี้ไม่มีสิทธิ์เข้าระบบผู้ดูแล',
    };
  }

  const role: 'admin' | 'marketing' = isAdmin ? 'admin' : 'marketing';
  const id = profile?.id || data.user.id;
  const name = profile?.name?.trim() || (role === 'marketing' ? 'Marketing' : 'Admin');

  await supabase.auth.signOut();
  return { status: 'ok', id, role, name };
}

