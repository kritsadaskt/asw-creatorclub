-- Optional commission promo label for affiliate listings.
-- Original start_comm / max_comm stay unchanged; the affiliate page shows a label only.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS comm_multiply_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comm_multiply_factor numeric NOT NULL DEFAULT 2;

COMMENT ON COLUMN projects.comm_multiply_enabled IS
  'When true, affiliate links page shows a promo label. Table commission amounts stay unchanged.';
COMMENT ON COLUMN projects.comm_multiply_factor IS
  'Factor shown on the affiliate promo label (e.g. x2). Default 2.';

-- Rollback:
-- ALTER TABLE projects DROP COLUMN IF EXISTS comm_multiply_enabled;
-- ALTER TABLE projects DROP COLUMN IF EXISTS comm_multiply_factor;

-- Rollback:
-- ALTER TABLE projects DROP COLUMN IF EXISTS comm_multiply_enabled;
-- ALTER TABLE projects DROP COLUMN IF EXISTS comm_multiply_factor;
