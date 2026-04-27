-- Contest year for pageant / MI–MU style registrations (`RegisterSection` → `profiles.pageant_year`).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pageant_year integer;
