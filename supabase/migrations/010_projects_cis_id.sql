-- CIS integer project id (SaveOtherSource ProjectID). Populate from CIS GetProjects / internal mapping.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cis_id integer;

COMMENT ON COLUMN projects.cis_id IS 'AssetWise CIS ProjectID (int); used when pushing FGF leads to CIS.';
