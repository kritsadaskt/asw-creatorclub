ALTER TABLE affiliate_materials ENABLE ROW LEVEL SECURITY;

-- Public read (creators browse gallery without auth)
CREATE POLICY "materials_read_all" ON affiliate_materials
  FOR SELECT USING (true);

-- All writes go through service role key only
CREATE POLICY "materials_write_service_role" ON affiliate_materials
  FOR ALL USING (auth.role() = 'service_role');

-- Rollback: ALTER TABLE affiliate_materials DISABLE ROW LEVEL SECURITY;
