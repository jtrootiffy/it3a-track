#!/usr/bin/env node
/**
 * Provision the two IT3A administrators.
 *
 *   npm run setup:admins
 *
 * Reads credentials from .env.local:
 *
 *   IT3A_ADMIN_1_USERNAME / _EMAIL / _FULL_NAME / _PASSWORD
 *   IT3A_ADMIN_2_USERNAME / _EMAIL / _FULL_NAME / _PASSWORD
 *
 * Order matters: the email is written to it3a_signup_allowlist BEFORE the auth
 * user is created, so the database-level signup trigger (0003) still allows the
 * two real accounts through while blocking everyone else.
 *
 * Idempotent. Re-running updates the password, email and admin row for each
 * username. Passwords are never printed.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

function fail(message) {
  console.error(`\n  FAILED  ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** True when the error means "the tables have not been migrated yet". */
function isMissingSchema(error) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /does not exist|schema cache|could not find the table/i.test(error.message)),
  );
}

function readAdmin(index) {
  const prefix = `IT3A_ADMIN_${index}`;
  const username = (process.env[`${prefix}_USERNAME`] ?? "").trim().toLowerCase();
  const email = (process.env[`${prefix}_EMAIL`] ?? "").trim().toLowerCase();
  const fullName = (process.env[`${prefix}_FULL_NAME`] ?? "").trim();
  const password = process.env[`${prefix}_PASSWORD`] ?? "";

  if (!username && !email && !password) return null;

  const problems = [];
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    problems.push(`${prefix}_USERNAME must be 3-40 chars: a-z 0-9 . _ -`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    problems.push(`${prefix}_EMAIL must be a valid email address`);
  }
  if (fullName.length < 2) {
    problems.push(`${prefix}_FULL_NAME is required`);
  }
  if (password.length < 8) {
    problems.push(`${prefix}_PASSWORD must be at least 8 characters`);
  }

  if (problems.length > 0) {
    fail(`Admin ${index} is misconfigured:\n  - ${problems.join("\n  - ")}`);
  }

  return { username, email, fullName, password };
}

async function assertSchema() {
  const { error } = await admin.from("it3a_admins").select("id").limit(1);
  if (isMissingSchema(error)) {
    fail(
      "The IT3A tables are missing.\n\n" +
        "  Run:  npm run migrate\n" +
        "  Then: npm run setup:admins",
    );
  }
  if (error) fail(`Could not read it3a_admins: ${error.message}`);
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not list auth users: ${error.message}`);
    const match = data.users.find((user) => (user.email ?? "").toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function provision(adminUser) {
  // 1. Allowlist first, so the signup-blocking trigger permits this account.
  const { error: allowError } = await admin.from("it3a_signup_allowlist").upsert(
    {
      email: adminUser.email,
      username: adminUser.username,
      full_name: adminUser.fullName,
    },
    { onConflict: "email" },
  );

  if (allowError) {
    fail(`Could not allowlist ${adminUser.email}: ${allowError.message}`);
  }

  // 2. Reuse the existing auth user for this username, if there is one.
  let userId = null;

  const { data: existingRow } = await admin
    .from("it3a_admins")
    .select("id, email")
    .eq("username", adminUser.username)
    .maybeSingle();

  if (existingRow?.id) {
    const { data, error } = await admin.auth.admin.getUserById(existingRow.id);
    if (!error && data?.user) userId = data.user.id;
  }

  if (!userId) {
    const byEmail = await findUserByEmail(adminUser.email);
    if (byEmail) userId = byEmail.id;
  }

  // 3. Create or repair the auth account.
  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        username: adminUser.username,
        full_name: adminUser.fullName,
      },
    });

    if (error) fail(`Could not update ${adminUser.username}: ${error.message}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        username: adminUser.username,
        full_name: adminUser.fullName,
      },
    });

    if (error) fail(`Could not create ${adminUser.username}: ${error.message}`);
    userId = data.user?.id ?? null;
  }

  if (!userId) fail(`No auth user id returned for ${adminUser.username}.`);

  // 4. Remove stale admin rows that would collide on username or email.
  const { data: clashes } = await admin
    .from("it3a_admins")
    .select("id, username, email");

  for (const row of clashes ?? []) {
    const sameUsername = row.username === adminUser.username && row.id !== userId;
    const sameEmail = row.email === adminUser.email && row.id !== userId;

    if (sameUsername || sameEmail) {
      const { error } = await admin.from("it3a_admins").delete().eq("id", row.id);
      if (error) fail(`Could not remove stale admin row: ${error.message}`);
    }
  }

  // 5. Link the auth user to the admin table.
  const { error: linkError } = await admin.from("it3a_admins").upsert(
    {
      id: userId,
      username: adminUser.username,
      email: adminUser.email,
      full_name: adminUser.fullName,
    },
    { onConflict: "id" },
  );

  if (linkError) fail(`Could not link ${adminUser.username}: ${linkError.message}`);

  return userId;
}

async function main() {
  await assertSchema();

  const admins = [readAdmin(1), readAdmin(2)].filter(Boolean);

  if (admins.length === 0) {
    fail("No IT3A_ADMIN_* credentials found in .env.local. See .env.example.");
  }

  console.log("\nIT3A - TRACK  |  provisioning administrators\n");

  for (const adminUser of admins) {
    const userId = await provision(adminUser);
    console.log(`  ok  ${adminUser.username.padEnd(18)} ${adminUser.email}  (${userId})`);
  }

  const { data: rows } = await admin
    .from("it3a_admins")
    .select("username, full_name, email")
    .order("username");

  console.log("\nAdministrators with dashboard access:");
  for (const row of rows ?? []) {
    console.log(`  - ${row.username}  ${row.full_name}  <${row.email}>`);
  }

  if ((rows ?? []).length !== 2) {
    console.log(
      `\n  Warning: ${(rows ?? []).length} admin row(s) exist. The brief requires exactly two.` +
        "\n  Remove extras in the Supabase table editor (it3a_admins).",
    );
  }

  console.log("\nPasswords were set from .env.local and are not printed.\n");
}

main().catch((error) => fail(error?.message ?? String(error)));
