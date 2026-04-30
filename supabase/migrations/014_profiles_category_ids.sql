-- Canonical creator category references: array of creator_categories.id as text.
-- Legacy `profiles.categories` remains for backward compatibility until fully cut over;
-- application resolves labels from `category_ids` via `creator_categories`.

alter table public.profiles
  add column if not exists category_ids text[] not null default '{}'::text[];

create index if not exists profiles_category_ids_gin
  on public.profiles using gin (category_ids);

-- Idempotent backfill: only rows where category_ids is still empty but legacy labels exist.
update public.profiles p
set category_ids = coalesce(s.new_ids, '{}'::text[])
from (
  select
    p2.id,
    array_agg(m.cid order by u.ord) filter (where m.cid is not null) as new_ids
  from public.profiles p2
  cross join lateral unnest(coalesce(p2.categories, '{}'::text[])) with ordinality as u(lbl, ord)
  left join lateral (
    select (
      select cc.id::text
      from public.creator_categories cc
      where
        regexp_replace(trim(lower(cc.th_label)), '\s+', ' ', 'g')
          = regexp_replace(trim(lower(u.lbl)), '\s+', ' ', 'g')
        or regexp_replace(trim(lower(cc.en_label)), '\s+', ' ', 'g')
          = regexp_replace(trim(lower(u.lbl)), '\s+', ' ', 'g')
        or regexp_replace(
          trim(lower(split_part(u.lbl, '-', 1))),
          '\s+',
          ' ',
          'g'
        ) = regexp_replace(trim(lower(cc.en_label)), '\s+', ' ', 'g')
      limit 1
    ) as cid
  ) m on true
  where coalesce(cardinality(p2.categories), 0) > 0
    and coalesce(cardinality(p2.category_ids), 0) = 0
  group by p2.id
) s
where p.id = s.id;
