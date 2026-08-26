-- Public /event/[slug] and admin preview URLs. Generated from the event name in the app.
alter table public.events
  add column if not exists slug text;

comment on column public.events.slug is
  'URL slug for /event/[slug]. Public when is_active; admin-only preview when inactive.';

-- Backfill: strip html, lowercase, then keep only latin/digits/thai letters.
update public.events
set slug = nullif(
  btrim(
    regexp_replace(
      regexp_replace(
        lower(regexp_replace(coalesce(name, ''), '<[^>]+>', '', 'g')),
        '[^a-z0-9ก-๛]+',
        '-',
        'g'
      ),
      '-{2,}',
      '-',
      'g'
    ),
    '-'
  ),
  ''
)
where slug is null or btrim(slug) = '';

-- Reserved paths and empty names fall back to an id-based slug.
update public.events
set slug = 'event-' || substr(replace(id::text, '-', ''), 1, 12)
where slug is null or btrim(slug) = '' or slug in ('check-in', 'checkin');

-- Deduplicate: keep the oldest row's slug, suffix the rest.
with ranked as (
  select
    id,
    slug,
    row_number() over (partition by slug order by created_at, id) as rn
  from public.events
)
update public.events e
set slug = e.slug || '-' || ranked.rn
from ranked
where e.id = ranked.id
  and ranked.rn > 1;

-- Nullable on purpose so an older app build can still insert events.
create unique index if not exists events_slug_uidx on public.events (slug);
