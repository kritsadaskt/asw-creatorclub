-- Manual verification after migration 014 (run in SQL editor).
-- 1) Profiles that still have legacy labels but no mapped ids (unmapped labels)
select p.id, p.email, p.categories, p.category_ids
from public.profiles p
where coalesce(cardinality(p.categories), 0) > 0
  and (
    coalesce(cardinality(p.category_ids), 0) = 0
    or (
      select count(*)::int
      from unnest(p.categories) as c(lbl)
      where not exists (
        select 1
        from public.creator_categories cc
        where regexp_replace(trim(lower(cc.th_label)), '\s+', ' ', 'g')
            = regexp_replace(trim(lower(c.lbl)), '\s+', ' ', 'g')
           or regexp_replace(trim(lower(cc.en_label)), '\s+', ' ', 'g')
            = regexp_replace(trim(lower(c.lbl)), '\s+', ' ', 'g')
           or regexp_replace(trim(lower(split_part(c.lbl, '-', 1))), '\s+', ' ', 'g')
            = regexp_replace(trim(lower(cc.en_label)), '\s+', ' ', 'g')
      )
    ) > 0
  )
order by p.created_at desc
limit 200;

-- 2) Count mismatch: number of legacy labels vs mapped ids (after backfill)
select
  p.id,
  p.email,
  cardinality(p.categories) as legacy_n,
  cardinality(p.category_ids) as id_n,
  p.categories,
  p.category_ids
from public.profiles p
where coalesce(cardinality(p.categories), 0) > 0
  and coalesce(cardinality(p.category_ids), 0) > 0
  and cardinality(p.categories) <> cardinality(p.category_ids)
order by p.created_at desc
limit 200;

-- 3) Spot-check join: show human-readable labels for stored ids
select p.id, p.email, p.category_ids, array_agg(cc.th_label order by o.ord) as th_labels
from public.profiles p
cross join lateral unnest(p.category_ids) with ordinality as o(cid, ord)
left join public.creator_categories cc on cc.id::text = o.cid
where coalesce(cardinality(p.category_ids), 0) > 0
group by p.id, p.email, p.category_ids
order by p.created_at desc
limit 50;
