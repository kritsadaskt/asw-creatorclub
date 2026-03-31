create table if not exists public.affiliate_materials (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete set null,
  title       text not null,
  description text,
  file_url    text not null,   -- AWS S3 public URL
  file_type   text not null default 'image',  -- 'image' | 'pdf' | 'video'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_affiliate_materials_project_id
  on public.affiliate_materials(project_id);
