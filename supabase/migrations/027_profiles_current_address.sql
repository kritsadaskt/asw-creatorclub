-- Current address fields for creator profiles (CreatorProfile "ที่อยู่ปัจจุบัน").
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_house_no text,
  ADD COLUMN IF NOT EXISTS address_village text,
  ADD COLUMN IF NOT EXISTS address_soi text,
  ADD COLUMN IF NOT EXISTS address_road text,
  ADD COLUMN IF NOT EXISTS address_sub_district text,
  ADD COLUMN IF NOT EXISTS address_district text,
  ADD COLUMN IF NOT EXISTS address_province text,
  ADD COLUMN IF NOT EXISTS address_postal_code text;
