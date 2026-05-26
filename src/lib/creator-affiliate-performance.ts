import { getCreatorAffiliateClickStats } from '@/lib/creator-affiliate-click-stats';
import {
  countCreatorRegistrations,
  fetchCreatorClubContactLogs,
} from '@/lib/cis-contact-log-register';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type CreatorAffiliatePerformance = {
  totalLinks: number;
  totalClicks: number;
  registrations: number | null;
  bookings: number;
  transfers: number;
  statsSyncedAt: string | null;
};

export async function getCreatorAffiliatePerformance(
  creatorId: string,
): Promise<CreatorAffiliatePerformance> {
  const [{ count: linkCount, error: linksError }, clickStats] = await Promise.all([
    supabaseAdmin
      .from('affiliate_links')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId),
    getCreatorAffiliateClickStats(creatorId),
  ]);

  if (linksError) {
    throw linksError;
  }

  let registrations: number | null = null;
  if (process.env.CONTACT_LOGS_TOKEN) {
    const logs = await fetchCreatorClubContactLogs();
    registrations = logs == null ? null : countCreatorRegistrations(logs, creatorId);
  }

  return {
    totalLinks: linkCount ?? 0,
    totalClicks: clickStats.totalClicks,
    registrations,
    bookings: 0,
    transfers: 0,
    statsSyncedAt: clickStats.statsSyncedAt,
  };
}
