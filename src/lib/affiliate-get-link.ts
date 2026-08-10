/**
 * Feature flag for affiliate "Get Link" / short-url creation.
 * Disabled unless explicitly set to "true" (used during shortlink provider migration).
 */
export function isAffiliateGetLinkEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AFFILIATE_GET_LINK_ENABLED === 'true';
}
