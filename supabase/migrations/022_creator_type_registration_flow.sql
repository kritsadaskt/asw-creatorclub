-- Drive invite registration behaviour from `creator_type` instead of hard-coded strings in the app.
alter table public.creator_type
  add column if not exists registration_flow text;

alter table public.creator_type
  drop constraint if exists creator_type_registration_flow_check;

alter table public.creator_type
  add constraint creator_type_registration_flow_check
  check (registration_flow is null or registration_flow in ('standard', 'household', 'pageant'));

update public.creator_type set registration_flow = 'standard' where key = 'assetwise_staff';
update public.creator_type set registration_flow = 'household' where key = 'asw_household';
update public.creator_type set registration_flow = 'pageant' where key in ('miss_world_th', 'mister_int', 'miss_th', 'mr_mrs_global');

-- Legacy generic invite URL `?type=pageant` (user then picks a specific stage).
-- Use INSERT … WHERE NOT EXISTS + UPDATE instead of ON CONFLICT (key): some DBs lack UNIQUE(key).
insert into public.creator_type (key, name_th, name_en, registration_flow)
select 'pageant', 'การประกวด', 'Pageant', 'pageant'
where not exists (select 1 from public.creator_type where key = 'pageant');

update public.creator_type
set
  name_th = 'การประกวด',
  name_en = 'Pageant',
  registration_flow = 'pageant'
where key = 'pageant';
