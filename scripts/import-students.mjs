#!/usr/bin/env node
/**
 * Import a roster from CSV.
 *
 *   npm run import:students -- --file roster.csv
 *   npm run import:students -- --file roster.csv --dry-run
 *
 * Columns (header row required, order does not matter):
 *   full_name        required
 *   payment_status   optional: paid | unpaid (default unpaid)
 *   remarks          optional
 *   merit_number     optional: paid students only (ignored for unpaid rows)
 *
 * Matching is case- and whitespace-insensitive on the full name, so running the
 * import twice updates rather than duplicates. Payment dates and audit entries
 * are still owned by the database triggers.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
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

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
const fileIndex = args.indexOf("--file");
const filePath = fileArg ?? (fileIndex >= 0 ? args[fileIndex + 1] : "roster.csv");
const dryRun = args.includes("--dry-run");

if (!url || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
}

/** Minimal RFC4180-ish CSV parser: handles quotes, escaped quotes, CRLF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const absolute = path.resolve(process.cwd(), filePath);

  let raw;
  try {
    raw = await readFile(absolute, "utf8");
  } catch {
    fail(`Could not read ${absolute}`);
  }

  const rows = parseCsv(raw);
  if (rows.length < 2) fail("The CSV needs a header row and at least one student.");

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const nameIndex = header.indexOf("full_name");

  if (nameIndex === -1) fail('The CSV must have a "full_name" column.');

  const statusIndex = header.indexOf("payment_status");
  const remarksIndex = header.indexOf("remarks");
  const meritIndex = header.indexOf("merit_number");

  const records = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const fullName = (cells[nameIndex] ?? "").trim().replace(/\s+/g, " ");

    if (fullName.length < 2) {
      console.log(`  skip row ${i + 1}: missing full name`);
      continue;
    }

    const key = normalizeName(fullName);
    if (seen.has(key)) {
      console.log(`  skip row ${i + 1}: duplicate of an earlier row (${fullName})`);
      continue;
    }
    seen.add(key);

    const rawStatus = (cells[statusIndex] ?? "").trim().toLowerCase();
    const status = rawStatus === "" ? "unpaid" : rawStatus;

    if (status !== "paid" && status !== "unpaid") {
      console.log(`  skip row ${i + 1}: payment_status must be paid or unpaid`);
      continue;
    }

    const record = {
      full_name: fullName,
      payment_status: status,
      remarks: (cells[remarksIndex] ?? "").trim(),
    };

    if (meritIndex !== -1) {
      let meritNumber = (cells[meritIndex] ?? "").trim();

      if (status !== "paid" && meritNumber) {
        console.log(
          `  skip merit number on row ${i + 1}: only a paid student can have one`,
        );
        meritNumber = "";
      }

      if (meritNumber.length > 40) {
        console.log(`  truncate merit number on row ${i + 1} to 40 characters`);
        meritNumber = meritNumber.slice(0, 40).trim();
      }

      record.merit_number = meritNumber || null;
    }

    records.push(record);
  }

  if (records.length === 0) fail("No valid student rows found.");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing, error: readError } = await admin
    .from("it3a_students")
    .select("id, full_name");

  if (readError) {
    fail(
      `Could not read it3a_students: ${readError.message}\n  Run npm run migrate first.`,
    );
  }

  const existingByName = new Map(
    (existing ?? []).map((row) => [normalizeName(row.full_name), row.id]),
  );

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const id = existingByName.get(normalizeName(record.full_name));

    if (dryRun) {
      if (id) updated += 1;
      else inserted += 1;
      continue;
    }

    if (id) {
      const { error } = await admin
        .from("it3a_students")
        .update({
          full_name: record.full_name,
          remarks: record.remarks,
          payment_status: record.payment_status,
          ...(meritIndex !== -1 ? { merit_number: record.merit_number } : {}),
        })
        .eq("id", id);

      if (error) fail(`Could not update ${record.full_name}: ${error.message}`);
      updated += 1;
    } else {
      const { error } = await admin.from("it3a_students").insert(record);
      if (error) fail(`Could not insert ${record.full_name}: ${error.message}`);
      inserted += 1;
      updated += 0;
    }
  }

  console.log(
    `\n${dryRun ? "Dry run" : "Import"} complete: ${inserted} added, ${updated} updated, ${records.length} rows read.`,
  );

  if (!dryRun) {
    const paid = records.filter((record) => record.payment_status === "paid").length;
    console.log(`Collected for this batch: ₱${(paid * 50).toLocaleString("en-PH")}`);
  }

  console.log("");
}

main().catch((error) => fail(error?.message ?? String(error)));
