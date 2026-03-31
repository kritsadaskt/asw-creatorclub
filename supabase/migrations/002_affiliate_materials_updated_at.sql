CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_affiliate_materials_updated_at
  BEFORE UPDATE ON affiliate_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
