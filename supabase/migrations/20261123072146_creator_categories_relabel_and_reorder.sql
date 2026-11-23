-- Relabel, merge, and reorder creator categories.
-- Absorbed ids: 5 แฟชั่น -> 4, 14 สุขภาพ -> 11, 19 การออกแบบ -> 20.
-- Backup: supabase/backups/2026-11-23-creator-categories/

create or replace function public._map_creator_category_label(lbl text)
returns text
language sql
immutable
as $$
  select case btrim(coalesce(lbl, ''))
    when 'ไลฟ์สไตล์ / การใช้ชีวิต' then 'ไลฟ์สไตล์'
    when 'Lifestyle - ไลฟส์สไตล์ / การใช้ชีวิต' then 'ไลฟ์สไตล์'
    when 'Lifestyle - ไลฟส์สไตล์/ การใช้ชีวิต' then 'ไลฟ์สไตล์'
    when 'ความงาม' then 'ความงาม & แฟชั่น'
    when 'Beauty - ความงาม' then 'ความงาม & แฟชั่น'
    when 'แฟชั่น' then 'ความงาม & แฟชั่น'
    when 'Fashion - แฟชั่น' then 'ความงาม & แฟชั่น'
    when 'กีฬา' then 'นักกีฬา'
    when 'Sports - กีฬา' then 'นักกีฬา'
    when 'การออกกำลังกาย' then 'ฟิตเนสและการดูแลสุขภาพ'
    when 'Fitness - การออกกำลังกาย' then 'ฟิตเนสและการดูแลสุขภาพ'
    when 'สุขภาพ' then 'ฟิตเนสและการดูแลสุขภาพ'
    when 'Health - สุขภาพ' then 'ฟิตเนสและการดูแลสุขภาพ'
    when 'ครอบครัว' then 'ครอบครัว&คู่รัก'
    when 'Family - ครอบครัว' then 'ครอบครัว&คู่รัก'
    when 'เทคโนโลยี' then 'แก็ดเจ็ตและเทคโนโลยี'
    when 'Technology - เทคโนโลยี' then 'แก็ดเจ็ตและเทคโนโลยี'
    when 'การศึกษา' then 'วิทยาศาสตร์และการศึกษา'
    when 'Education - การศึกษา' then 'วิทยาศาสตร์และการศึกษา'
    when 'การออกแบบ' then 'สถาปัตยกรรม&การออกแบบ'
    when 'Design - การออกแบบ' then 'สถาปัตยกรรม&การออกแบบ'
    when 'สถาปัตยกรรม' then 'สถาปัตยกรรม&การออกแบบ'
    when 'Architecture - การออกแบบ' then 'สถาปัตยกรรม&การออกแบบ'
    when 'Architecture - สถาปัตยกรรม' then 'สถาปัตยกรรม&การออกแบบ'
    when 'การลงทุน' then 'การลงทุนและการเงิน'
    when 'Invesment - การลงทุน' then 'การลงทุนและการเงิน'
    when 'Investment - การลงทุน' then 'การลงทุนและการเงิน'
    else btrim(coalesce(lbl, ''))
  end;
$$;

alter table public.profiles disable trigger update_profiles_updated_at;

drop table if exists category_migration_expect;

create temp table category_migration_expect (
  survivor_id text primary key,
  creator_count integer not null
);

insert into category_migration_expect (survivor_id, creator_count)
select '4', count(*)
from public.profiles
where category_ids && array['4', '5']::text[]
   or (
     coalesce(cardinality(category_ids), 0) = 0
     and (
       categories && array['ความงาม', 'แฟชั่น', 'Beauty - ความงาม', 'Fashion - แฟชั่น']::text[]
       or category in ('ความงาม', 'แฟชั่น', 'Beauty - ความงาม', 'Fashion - แฟชั่น')
     )
   )
union all
select '11', count(*)
from public.profiles
where category_ids && array['11', '14']::text[]
   or (
     coalesce(cardinality(category_ids), 0) = 0
     and (
       categories && array['การออกกำลังกาย', 'สุขภาพ', 'Fitness - การออกกำลังกาย', 'Health - สุขภาพ']::text[]
       or category in ('การออกกำลังกาย', 'สุขภาพ', 'Fitness - การออกกำลังกาย', 'Health - สุขภาพ')
     )
   )
union all
select '20', count(*)
from public.profiles
where category_ids && array['19', '20']::text[]
   or (
     coalesce(cardinality(category_ids), 0) = 0
     and (
       categories && array['การออกแบบ', 'สถาปัตยกรรม', 'Design - การออกแบบ', 'Architecture - การออกแบบ', 'Architecture - สถาปัตยกรรม']::text[]
       or category in ('การออกแบบ', 'สถาปัตยกรรม', 'Design - การออกแบบ', 'Architecture - การออกแบบ', 'Architecture - สถาปัตยกรรม')
     )
   );

update public.profiles as p
set category_ids = mapped.new_ids
from (
  select
    p2.id,
    coalesce((
      select array_agg(x.cid order by x.ord)
      from (
        select
          case u.cid
            when '5' then '4'
            when '14' then '11'
            when '19' then '20'
            else u.cid
          end as cid,
          min(u.ord) as ord
        from unnest(p2.category_ids) with ordinality as u(cid, ord)
        where u.cid is not null and btrim(u.cid) <> ''
        group by 1
      ) as x
    ), '{}'::text[]) as new_ids
  from public.profiles as p2
  where p2.category_ids && array['5', '14', '19']::text[]
) as mapped
where p.id = mapped.id;

do $$
begin
  if to_regclass('public.profiles_uat') is null then
    return;
  end if;

  update public.profiles_uat as p
  set category_ids = mapped.new_ids
  from (
    select
      p2.id,
      coalesce((
        select array_agg(x.cid order by x.ord)
        from (
          select
            case u.cid
              when '5' then '4'
              when '14' then '11'
              when '19' then '20'
              else u.cid
            end as cid,
            min(u.ord) as ord
          from unnest(p2.category_ids) with ordinality as u(cid, ord)
          where u.cid is not null and btrim(u.cid) <> ''
          group by 1
        ) as x
      ), '{}'::text[]) as new_ids
    from public.profiles_uat as p2
    where p2.category_ids && array['5', '14', '19']::text[]
  ) as mapped
  where p.id = mapped.id;
end $$;

update public.creator_categories as c
set
  th_label = v.th_label,
  en_label = v.en_label,
  "order" = v.sort_order,
  is_active = true
from (
  values
    (1, 'ไลฟ์สไตล์', 'Lifestyle', 1),
    (2, 'อาหาร', 'Food', 2),
    (3, 'ท่องเที่ยว', 'Travel', 3),
    (4, 'ความงาม & แฟชั่น', 'Beauty & Fashion', 4),
    (6, 'ความบันเทิง', 'Entertainment', 5),
    (17, 'สัตว์เลี้ยง', 'Pet', 6),
    (7, 'นักกีฬา', 'Athlete', 7),
    (10, 'เกม', 'Gaming', 10),
    (11, 'ฟิตเนสและการดูแลสุขภาพ', 'Fitness & Health', 11),
    (12, 'ครอบครัว&คู่รัก', 'Family & Couple', 12),
    (13, 'แก็ดเจ็ตและเทคโนโลยี', 'Gadgets & Technology', 13),
    (15, 'วิทยาศาสตร์และการศึกษา', 'Science & Education', 14),
    (20, 'สถาปัตยกรรม&การออกแบบ', 'Architecture & Design', 15),
    (22, 'การลงทุนและการเงิน', 'Investment & Finance', 16),
    (23, 'อสังหาริมทรัพย์', 'Real-Estate', 17),
    (16, 'ข่าว', 'News', 21),
    (8, 'เพลง', 'Music', 22),
    (9, 'ศิลปะ', 'Art', 23),
    (18, 'วิทยาศาสตร์', 'Science', 24),
    (21, 'อื่นๆ', 'Other', 25)
) as v(id, th_label, en_label, sort_order)
where c.id = v.id;

insert into public.creator_categories (id, th_label, en_label, is_active, "order")
values
  (24, 'นักศึกษา', 'University Student', true, 8),
  (25, 'นักเรียน', 'Student', true, 9),
  (26, 'การถ่ายภาพและช่างภาพ', 'Photography', true, 18),
  (27, 'โหราศาสตร์และความเชื่อ', 'Astrology & Beliefs', true, 19),
  (28, 'ตลกและคอนเทนต์สายฮา', 'Comedy', true, 20)
on conflict (id) do update
set
  th_label = excluded.th_label,
  en_label = excluded.en_label,
  is_active = excluded.is_active,
  "order" = excluded."order";

do $$
begin
  if exists (
    select 1
    from public.profiles
    where category_ids && array['5', '14', '19']::text[]
  ) then
    raise exception 'profiles still reference absorbed category ids';
  end if;

  if to_regclass('public.profiles_uat') is not null and exists (
    select 1
    from public.profiles_uat
    where category_ids && array['5', '14', '19']::text[]
  ) then
    raise exception 'profiles_uat still reference absorbed category ids';
  end if;
end $$;

delete from public.creator_categories
where id in (5, 14, 19);

update public.profiles as p
set
  categories = mapped.labels,
  category = case
    when p.category is null then null
    when btrim(p.category) = '' then p.category
    else public._map_creator_category_label(p.category)
  end
from (
  select
    p2.id,
    coalesce((
      select array_agg(x.lbl order by x.ord)
      from (
        select public._map_creator_category_label(u.lbl) as lbl, min(u.ord) as ord
        from unnest(coalesce(p2.categories, '{}'::text[])) with ordinality as u(lbl, ord)
        where btrim(coalesce(u.lbl, '')) <> ''
        group by 1
      ) as x
    ), '{}'::text[]) as labels
  from public.profiles as p2
  where coalesce(cardinality(p2.category_ids), 0) = 0
    and coalesce(cardinality(p2.categories), 0) > 0
) as mapped
where p.id = mapped.id;

update public.profiles as p
set category_ids = coalesce((
  select array_agg(cc.id::text order by u.ord)
  from unnest(p.categories) with ordinality as u(lbl, ord)
  join public.creator_categories as cc
    on cc.th_label = u.lbl
   and cc.is_active
), '{}'::text[])
where coalesce(cardinality(p.category_ids), 0) = 0
  and coalesce(cardinality(p.categories), 0) > 0;

update public.profiles as p
set
  categories = labels.th_labels,
  category = case
    when cardinality(labels.th_labels) > 0 then labels.th_labels[1]
    else p.category
  end
from (
  select
    p2.id,
    coalesce((
      select array_agg(cc.th_label order by o.ord)
      from unnest(p2.category_ids) with ordinality as o(cid, ord)
      join public.creator_categories as cc
        on cc.id::text = o.cid
       and cc.is_active
    ), '{}'::text[]) as th_labels
  from public.profiles as p2
  where coalesce(cardinality(p2.category_ids), 0) > 0
) as labels
where p.id = labels.id;

do $$
begin
  if to_regclass('public.profiles_uat') is null then
    return;
  end if;

  update public.profiles_uat as p
  set
    categories = labels.th_labels,
    category = case
      when cardinality(labels.th_labels) > 0 then labels.th_labels[1]
      else p.category
    end
  from (
    select
      p2.id,
      coalesce((
        select array_agg(cc.th_label order by o.ord)
        from unnest(p2.category_ids) with ordinality as o(cid, ord)
        join public.creator_categories as cc
          on cc.id::text = o.cid
         and cc.is_active
      ), '{}'::text[]) as th_labels
    from public.profiles_uat as p2
    where coalesce(cardinality(p2.category_ids), 0) > 0
  ) as labels
  where p.id = labels.id;
end $$;

alter table public.profiles enable trigger update_profiles_updated_at;

do $$
declare
  category_count integer;
  order_count integer;
  orphan_count integer;
  unlabeled_count integer;
  survivor_id text;
  expected_count integer;
  actual_count integer;
begin
  select count(*) into category_count
  from public.creator_categories
  where is_active;

  if category_count <> 25 then
    raise exception 'expected 25 active categories, got %', category_count;
  end if;

  select count(distinct "order") into order_count
  from public.creator_categories
  where is_active;

  if order_count <> 25 then
    raise exception 'category order is not unique across 25 rows';
  end if;

  if exists (
    select 1 from public.creator_categories where id in (5, 14, 19)
  ) then
    raise exception 'absorbed categories were not removed';
  end if;

  select count(*) into orphan_count
  from public.profiles as p
  cross join lateral unnest(coalesce(p.category_ids, '{}'::text[])) as cid
  left join public.creator_categories as cc on cc.id::text = cid
  where cc.id is null;

  if orphan_count <> 0 then
    raise exception 'profiles contain % unknown category ids', orphan_count;
  end if;

  select count(*) into unlabeled_count
  from public.profiles
  where coalesce(cardinality(category_ids), 0) = 0
    and coalesce(cardinality(categories), 0) > 0;

  if unlabeled_count <> 0 then
    raise exception '% profiles still have labels without category ids', unlabeled_count;
  end if;

  for survivor_id, expected_count in
    select e.survivor_id, e.creator_count
    from category_migration_expect as e
  loop
    select count(*) into actual_count
    from public.profiles
    where category_ids @> array[survivor_id]::text[];

    if actual_count <> expected_count then
      raise exception 'category % count % does not match expected %', survivor_id, actual_count, expected_count;
    end if;
  end loop;
end $$;

drop function public._map_creator_category_label(text);

drop table if exists category_migration_expect;
