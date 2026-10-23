#!/usr/bin/env node
/**
 * Apply every SQL file in supabase/migrations, in filename order.
 *
 *   npm run migrate
 *   npm run migrate -- --exclude 0003
 *
 * Uses DATABASE_URL (direct or pooler connection string) and runs each file in
 * its own transaction, so a failure leaves the database in its previous state.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, "..", "supabase", "migrations");

function fail(message) {
  console.error(`\n  FAILED  ${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const exclude = args
  .find((arg) => arg.startsWith("--exclude="))
  ?.slice("--exclude=".length)
  ?.trim();

const connectionString = (process.env.DATABASE_URL ?? "").trim();

if (!connectionString) {
  fail(
    "DATABASE_URL is not set.\n" +
      "  Add it to .env.local. Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI.",
  );
}

/** Host and user as Node will actually parse them, or null when the URI is malformed. */
function describeTarget(value) {
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
      user: decodeURIComponent(parsed.username),
    };
  } catch {
    return null;
  }
}

const target = describeTarget(connectionString);

if (!target || (!target.host.includes(".") && target.host !== "localhost")) {
  fail(
    "DATABASE_URL is not a valid URI.\n" +
      "  Special characters in the password must be percent-encoded (@ -> %40, # -> %23, / -> %2F, : -> %3A).\n" +
      "  Copy the URI straight from Dashboard -> Connect to avoid typos.",
  );
}

let files;
try {
  files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => !exclude || !name.includes(exclude));
} catch {
  fail(`Could not read ${migrationsDir}`);
}

if (files.length === 0) {
  fail("No migration files matched.");
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

try {
  await client.connect();
} catch (error) {
  const message = String(error.message ?? error);
  const isDirectSupabaseHost = /^db\.[a-z0-9]+\.supabase\.co$/i.test(target.host);

  if (/ENOTFOUND|EAI_AGAIN/i.test(message) && isDirectSupabaseHost) {
    const ref = target.host.split(".")[1];
    fail(
      `Could not resolve ${target.host}.\n\n` +
        "  Supabase's direct connection host is IPv6-only on newer projects, so it fails on\n" +
        "  networks without IPv6. Use the Session pooler instead:\n\n" +
        "  Dashboard -> Connect -> Connection string -> Session pooler\n\n" +
        `    postgresql://postgres.${ref}:<url-encoded-password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n\n` +
        "  Note the username is postgres.<project-ref>, not postgres, and any special\n" +
        "  character in the password must be percent-encoded (@ -> %40).",
    );
  }

  if (/password authentication failed|SASL|SCRAM/i.test(message)) {
    fail(
      `Postgres rejected the credentials for ${target.user}@${target.host}:${target.port}.\n\n` +
        "  - Direct connections use the username postgres.\n" +
        "  - The Session pooler uses postgres.<project-ref>.\n" +
        "  - A password containing @ # / or : must be percent-encoded (@ -> %40).\n" +
        "  - The database password is not always the one you signed up with; reset it in\n" +
        "    Dashboard -> Project Settings -> Database if needed.",
    );
  }

  fail(`Could not connect to Postgres: ${message}`);
}

console.log(`\nIT3A - TRACK  |  applying ${files.length} migration(s)\n`);

for (const file of files) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  process.stdout.write(`  ${file} ... `);

  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("ok");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.log("failed");
    await client.end().catch(() => {});
    fail(`${file}\n  ${error.message}`);
  }
}

await client.query("notify pgrst, 'reload schema'").catch(() => {});
await client.end();

console.log("\nDone. Schema and policies are up to date.\n");
