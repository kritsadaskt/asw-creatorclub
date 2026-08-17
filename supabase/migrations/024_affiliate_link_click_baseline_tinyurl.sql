-- Additive click totals: Shlink history (baseline) + TinyURL hits since seed.
-- total_visits is always maintained as shlink_baseline + tinyurl_hits.

ALTER TABLE affiliate_link_click_stats
  ADD COLUMN IF NOT EXISTS shlink_baseline integer,
  ADD COLUMN IF NOT EXISTS tinyurl_hits integer;

-- One-time backfill: existing totals were Shlink-era (or max-merged) → treat as baseline.
UPDATE affiliate_link_click_stats
SET
  shlink_baseline = COALESCE(shlink_baseline, total_visits, 0),
  tinyurl_hits = COALESCE(tinyurl_hits, 0)
WHERE shlink_baseline IS NULL OR tinyurl_hits IS NULL;

COMMENT ON COLUMN affiliate_link_click_stats.shlink_baseline IS
  'Frozen/raised Shlink visit total (pre-cutover + live Shlink while still online)';
COMMENT ON COLUMN affiliate_link_click_stats.tinyurl_hits IS
  'TinyURL alias hits since seed (starts near 0)';
COMMENT ON COLUMN affiliate_link_click_stats.total_visits IS
  'Display total = shlink_baseline + tinyurl_hits';

-- Rollback:
-- ALTER TABLE affiliate_link_click_stats DROP COLUMN IF EXISTS shlink_baseline;
-- ALTER TABLE affiliate_link_click_stats DROP COLUMN IF EXISTS tinyurl_hits;
