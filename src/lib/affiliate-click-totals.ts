/**
 * Combine pre-cutover Shlink clicks with post-seed TinyURL hits.
 * TinyURL cannot import Shlink history — totals must be additive.
 */

export function combineAffiliateClickTotals(
  shlinkBaseline: number | null | undefined,
  tinyurlHits: number | null | undefined,
): number {
  const baseline =
    shlinkBaseline != null && Number.isFinite(shlinkBaseline)
      ? Math.max(0, Math.trunc(shlinkBaseline))
      : 0;
  const hits =
    tinyurlHits != null && Number.isFinite(tinyurlHits) ? Math.max(0, Math.trunc(tinyurlHits)) : 0;
  return baseline + hits;
}

/** Raise baseline when a fresher Shlink (or CSV) total is available; never lower it. */
export function raiseShlinkBaseline(
  currentBaseline: number | null | undefined,
  candidate: number | null | undefined,
): number {
  const cur =
    currentBaseline != null && Number.isFinite(currentBaseline)
      ? Math.max(0, Math.trunc(currentBaseline))
      : 0;
  if (candidate == null || !Number.isFinite(candidate)) return cur;
  return Math.max(cur, Math.trunc(candidate));
}
