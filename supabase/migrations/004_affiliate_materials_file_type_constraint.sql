ALTER TABLE affiliate_materials
  ADD CONSTRAINT affiliate_materials_file_type_check
  CHECK (file_type IN ('image', 'pdf', 'video'));
