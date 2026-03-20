-- Password recovery requests table
create table if not exists public.password_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  otp_code text not null,
  otp_expires_at timestamptz not null,
  attempts integer not null default 0,
  status text not null default 'pending',
  reset_token text,
  reset_token_expires_at timestamptz,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_password_recovery_requests_email_requested_at
  on public.password_recovery_requests(email, requested_at desc);

-- Password recovery logs table
create table if not exists public.password_recovery_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  action text not null,
  status text not null,
  recovery_request_id uuid references public.password_recovery_requests(id) on delete set null,
  message text,
  created_at timestamptz not null default now()
);

