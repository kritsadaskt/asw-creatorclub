import type { AffiliateProject } from './affiliate';

function cisSortKey(cisId?: number | null): number {
  return cisId != null && Number.isFinite(cisId) ? cisId : Number.POSITIVE_INFINITY;
}

/** Affiliate list: pinned → commission boost → cis_id ascending. */
export function compareAffiliateProjects(a: AffiliateProject, b: AffiliateProject): number {
  const aPinned = a.pinAffiliate ? 1 : 0;
  const bPinned = b.pinAffiliate ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;

  const aBoosted = a.commMultiplyEnabled ? 1 : 0;
  const bBoosted = b.commMultiplyEnabled ? 1 : 0;
  if (aBoosted !== bBoosted) return bBoosted - aBoosted;

  return cisSortKey(a.cis_id) - cisSortKey(b.cis_id);
}

/** FGF list: pinned → cis_id ascending. */
export function compareFgfProjects(a: AffiliateProject, b: AffiliateProject): number {
  const aPinned = a.pinFgf ? 1 : 0;
  const bPinned = b.pinFgf ? 1 : 0;
  if (aPinned !== bPinned) return bPinned - aPinned;

  return cisSortKey(a.cis_id) - cisSortKey(b.cis_id);
}
