-- Per-year, race-safe certificate serial counter (CFD-YYYY-NNN).
-- See docs/specifications/certificate-sequential-serial-numbers.md.
--
-- The atomic upsert below is what makes this safe under concurrent
-- issuance: INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING is a single
-- statement, so Postgres serializes concurrent callers at the row level —
-- there is no read-then-write window for two callers to observe the same
-- "next" value, unlike a SELECT count(*) + 1 approach in application code.

CREATE TABLE IF NOT EXISTS "certificate_counters" (
  "year"       integer PRIMARY KEY,
  "next_value" integer NOT NULL DEFAULT 1
);

ALTER TABLE "certificate_counters" ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role admin client (issuance path) ever
-- touches this table, same as certificates/course_progress writes.

CREATE OR REPLACE FUNCTION next_certificate_number(p_year integer)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO certificate_counters (year, next_value)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET next_value = certificate_counters.next_value + 1
  RETURNING next_value;
$$;

-- Issuance runs via the service-role admin client already, but keep this
-- locked down the same way other trusted-server RPCs in this project are
-- (see 20260902101131_revoke_anon_execute_on_admin_only_rpc_functions.sql).
REVOKE EXECUTE ON FUNCTION next_certificate_number(integer) FROM PUBLIC, anon, authenticated;
