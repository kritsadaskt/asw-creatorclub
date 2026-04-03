-- Application error audit trail (Bangkok wall-clock timestamps; service role writes only)

CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp without time zone NOT NULL DEFAULT timezone('Asia/Bangkok', now()),
  environment text NOT NULL,
  source text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  stack text,
  context jsonb
);

CREATE INDEX error_logs_created_at_idx ON error_logs (created_at DESC);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Inserts/selects use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). No anon/authenticated policies.

-- Rollback: DROP TABLE IF EXISTS error_logs;
