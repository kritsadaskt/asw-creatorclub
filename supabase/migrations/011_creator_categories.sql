-- Master table for creator categories.
-- Uses integer IDs so application code can reference stable IDs.

create table if not exists public.creator_categories (
  id integer primary key,
  th_label text not null,
  en_label text not null,
  is_active boolean not null default true
);

create unique index if not exists creator_categories_th_label_unique
  on public.creator_categories (th_label);

create unique index if not exists creator_categories_en_label_unique
  on public.creator_categories (en_label);

create index if not exists creator_categories_is_active_idx
  on public.creator_categories (is_active);

insert into public.creator_categories (id, th_label, en_label, is_active)
values
  (1, 'ไลฟ์สไตล์ / การใช้ชีวิต', 'Lifestyle', true),
  (2, 'อาหาร', 'Food', true),
  (3, 'ท่องเที่ยว', 'Travel', true),
  (4, 'ความงาม', 'Beauty', true),
  (5, 'แฟชั่น', 'Fashion', true),
  (6, 'ความบันเทิง', 'Entertainment', true),
  (7, 'กีฬา', 'Sports', true),
  (8, 'เพลง', 'Music', true),
  (9, 'ศิลปะ', 'Art', true),
  (10, 'เกม', 'Gaming', true),
  (11, 'การออกกำลังกาย', 'Fitness', true),
  (12, 'ครอบครัว', 'Family', true),
  (13, 'เทคโนโลยี', 'Technology', true),
  (14, 'สุขภาพ', 'Health', true),
  (15, 'การศึกษา', 'Education', true),
  (16, 'ข่าว', 'News', true),
  (17, 'สัตว์เลี้ยง', 'Pet', true),
  (18, 'วิทยาศาสตร์', 'Science', true),
  (19, 'การออกแบบ', 'Design', true),
  (20, 'สถาปัตยกรรม', 'Architecture', true),
  (21, 'อื่นๆ', 'Other', true)
on conflict (id) do update
set
  th_label = excluded.th_label,
  en_label = excluded.en_label,
  is_active = excluded.is_active;
