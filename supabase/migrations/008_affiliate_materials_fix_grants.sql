-- Tighten permissions: anon only needs SELECT (all writes require service_role via RLS)
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_materials FROM anon;

-- Reload schema cache
NOTIFY pgrst, reload_schema;
