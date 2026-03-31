-- Friend Get Friend leads schema
-- Stores one lead submission + many referred projects.

create extension if not exists pgcrypto;

create table if not exists public.fgf_leads (
  id uuid primary key default gen_random_uuid(),

  -- Referrer (ผู้แนะนำ)
  referrer_name text not null,
  referrer_last_name text not null,
  referrer_email text not null,
  referrer_tel text not null,
  referrer_creator_id uuid references public.profiles (id) on delete set null,

  -- Referred lead (ผู้ถูกแนะนำ)
  lead_name text not null,
  lead_last_name text not null,
  lead_email text not null,
  lead_tel text not null,

  -- Workflow / CRM
  status text not null default 'new',
  chosen_project_id uuid references public.projects (id) on delete set null,
  uploaded_to_crm boolean not null default false,
  uploaded_at timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  crm_response jsonb,

  -- Audit
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint fgf_leads_status_check check (
    status in ('new', 'contacting', 'verified', 'uploaded')
  )
);

create table if not exists public.fgf_lead_projects (
  id uuid primary key default gen_random_uuid(),
  fgf_lead_id uuid not null references public.fgf_leads (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists fgf_lead_projects_unique
  on public.fgf_lead_projects (fgf_lead_id, project_id);

create index if not exists fgf_lead_projects_project_id_idx
  on public.fgf_lead_projects (project_id);

create index if not exists fgf_leads_created_at_idx
  on public.fgf_leads (created_at desc);

create index if not exists fgf_leads_status_idx
  on public.fgf_leads (status);

create index if not exists fgf_leads_referrer_creator_id_idx
  on public.fgf_leads (referrer_creator_id);

create or replace function public.set_fgf_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_set_fgf_leads_updated_at on public.fgf_leads;
create trigger trg_set_fgf_leads_updated_at
before update on public.fgf_leads
for each row
execute procedure public.set_fgf_leads_updated_at();
