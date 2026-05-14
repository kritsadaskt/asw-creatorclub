-- Add materials_url column to campaigns for external materials download link.
alter table if exists public.campaigns
  add column if not exists materials_url text;
