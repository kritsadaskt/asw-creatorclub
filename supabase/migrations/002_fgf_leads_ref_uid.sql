-- Optional reference to current session user id (text; supports any id format)
alter table public.fgf_leads
  add column if not exists ref_uid text;

create index if not exists fgf_leads_ref_uid_idx
  on public.fgf_leads (ref_uid)
  where ref_uid is not null;
