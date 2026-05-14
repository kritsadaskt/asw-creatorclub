-- Add terms_url column to campaigns for custom terms & conditions link.
alter table if exists public.campaigns
  add column if not exists terms_url text;
