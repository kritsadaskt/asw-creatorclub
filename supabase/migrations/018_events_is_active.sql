-- Public /event page only shows events where is_active = true (see getCurrentEvent in app).
alter table public.events
  add column if not exists is_active boolean not null default true;

comment on column public.events.is_active is 'When false, the public /event flow does not surface this event (registration page stays empty for it).';
