-- Pin flags to boost projects to the top of affiliate / FGF listing tables.
-- Separate columns so a project can be pinned on one list without the other.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS pin_affiliate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_fgf boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN projects.pin_affiliate IS
  'When true, project is sorted to the top of /affiliate project lists.';
COMMENT ON COLUMN projects.pin_fgf IS
  'When true, project is sorted to the top of /friendgetfriends project lists.';

-- Rollback:
-- ALTER TABLE projects DROP COLUMN IF EXISTS pin_affiliate;
-- ALTER TABLE projects DROP COLUMN IF EXISTS pin_fgf;
