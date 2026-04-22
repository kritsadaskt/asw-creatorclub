-- Store CIS identifiers returned from /api/fgf/submit response payload.
alter table public.fgf_leads
  add column if not exists "cis_contactLogID" integer,
  add column if not exists "cis_customerID" integer;

create index if not exists fgf_leads_cis_contactlogid_idx
  on public.fgf_leads ("cis_contactLogID")
  where "cis_contactLogID" is not null;

create index if not exists fgf_leads_cis_customerid_idx
  on public.fgf_leads ("cis_customerID")
  where "cis_customerID" is not null;
