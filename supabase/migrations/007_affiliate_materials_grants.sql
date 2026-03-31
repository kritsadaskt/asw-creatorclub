-- Ensure the required PostgREST API roles have access to the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_materials TO anon, authenticated;

-- Force PostgREST to reload its schema cache to expose the table to the client API
NOTIFY pgrst, reload_schema;
