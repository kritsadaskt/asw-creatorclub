-- Cached Shlink visit aggregates (filled by cron / sync job; app reads via service role)

CREATE TABLE affiliate_link_click_stats (
  affiliate_link_id uuid NOT NULL PRIMARY KEY REFERENCES affiliate_links (id) ON DELETE CASCADE,
  total_visits integer,
  non_bot_visits integer,
  long_url text,
  synced_at timestamptz NOT NULL DEFAULT timezone('UTC', now())
);

CREATE INDEX affiliate_link_click_stats_synced_at_idx ON affiliate_link_click_stats (synced_at DESC);

CREATE TABLE affiliate_link_daily_clicks (
  affiliate_link_id uuid NOT NULL REFERENCES affiliate_links (id) ON DELETE CASCADE,
  click_date date NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT timezone('UTC', now()),
  PRIMARY KEY (affiliate_link_id, click_date)
);

CREATE INDEX affiliate_link_daily_clicks_date_idx ON affiliate_link_daily_clicks (click_date DESC);

ALTER TABLE affiliate_link_click_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_link_daily_clicks ENABLE ROW LEVEL SECURITY;

-- Reads/writes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). No anon/authenticated policies.

-- Rollback:
-- DROP TABLE IF EXISTS affiliate_link_daily_clicks;
-- DROP TABLE IF EXISTS affiliate_link_click_stats;
