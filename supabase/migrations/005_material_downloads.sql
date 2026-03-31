CREATE TABLE material_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES affiliate_materials(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX material_downloads_material_id ON material_downloads(material_id);
CREATE INDEX material_downloads_creator_id ON material_downloads(creator_id);

ALTER TABLE material_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads_service_role" ON material_downloads FOR ALL USING (auth.role() = 'service_role');
