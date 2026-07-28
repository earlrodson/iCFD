// supabase db push against the 6543 transaction pooler fails with
// "prepared statement already exists" (Supavisor transaction mode doesn't
// support prepared statements/advisory locks). Migrations need session mode,
// which is the same pooler host on port 5432.
import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sessionPoolerUrl = databaseUrl.replace(":6543/", ":5432/");

execSync(`supabase db push --db-url "${sessionPoolerUrl}" --yes`, {
  stdio: "inherit",
});
