# Legacy — superseded by `supabase/migrations/`

These files are historical only and are **not** run by any tooling. They
never matched what was actually applied to the live database (migrations
were applied ad hoc, outside this folder, for most of the project's
history).

The real, verified migration history now lives in `supabase/migrations/`,
reconstructed from and checked against the live project's
`supabase_migrations.schema_migrations` table (confirmed with
`supabase db push --dry-run` reporting "Remote database is up to date" as
of 2026-07-28). New migrations should be added there, using
`supabase migration new <name>` or a `<timestamp>_<name>.sql` file, and
will be applied automatically on deploy via the `vercel-build` script in
`package.json` (`supabase db push --db-url "$DATABASE_URL" --yes`).

Kept in place rather than deleted for historical reference.
