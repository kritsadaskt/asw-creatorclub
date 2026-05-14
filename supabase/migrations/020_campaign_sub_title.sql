-- Add sub_title column to campaigns.
alter table if exists public.campaigns
  add column if not exists sub_title text;
