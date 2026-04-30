-- Extend campaigns for Creator Club campaign feature set.
alter table if exists public.campaigns
  add column if not exists campaign_key text,
  add column if not exists banner_desktop_url text,
  add column if not exists banner_mobile_url text,
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists is_active boolean not null default true;

create unique index if not exists campaigns_campaign_key_unique_idx
  on public.campaigns (lower(campaign_key))
  where campaign_key is not null;

create index if not exists campaigns_is_active_idx
  on public.campaigns (is_active);

create index if not exists campaigns_start_at_idx
  on public.campaigns (start_at);

create index if not exists campaigns_end_at_idx
  on public.campaigns (end_at);
