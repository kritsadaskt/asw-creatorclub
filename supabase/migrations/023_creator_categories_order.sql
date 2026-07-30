-- Display / dropdown sort key for creator category options.
-- Already present in some environments; keep migration idempotent.
alter table public.creator_categories
  add column if not exists "order" integer;

update public.creator_categories
set "order" = id
where "order" is null;

create index if not exists creator_categories_order_idx
  on public.creator_categories ("order");
