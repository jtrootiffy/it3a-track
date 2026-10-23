import { createPublicClient } from "@/lib/supabase/public";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { collectedFrom } from "@/lib/format";
import { withRanks, type PublicLedgerRow } from "@/lib/selectors";
import type { PublicStudent } from "@/lib/types";

export type PublicLedger =
  | {
      ready: true;
      students: PublicStudent[];
      paidCount: number;
      collected: number;
    }
  | {
      ready: false;
      reason: "unconfigured" | "schema" | "unreachable";
      detail?: string;
    };

/**
 * The ONLY query the public page runs.
 *
 * Column list is deliberately explicit: `remarks` is not in the anon SELECT
 * grant, and asking for it would fail the whole request. RLS already restricts
 * the result to paid rows; the explicit filter keeps the intent obvious.
 */
export async function getPublicLedger(): Promise<PublicLedger> {
  const env = readSupabaseEnv();
  if (!env.configured) {
    return {
      ready: false,
      reason: "unconfigured",
      detail: `Missing or invalid in this deployment: ${env.missing.join(", ")}`,
    };
  }

  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from("it3a_students")
      .select("id, full_name, payment_status, payment_date, created_at")
      .eq("payment_status", "paid")
      .order("payment_date", { ascending: true })
      .limit(1000);

    if (error) {
      const missing =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /does not exist|schema cache|permission denied/i.test(error.message);

      return {
        ready: false,
        reason: missing ? "schema" : "unreachable",
        detail: error.message,
      };
    }

    const students = withRanks((data ?? []) as PublicLedgerRow[]);

    return {
      ready: true,
      students,
      paidCount: students.length,
      collected: collectedFrom(students.length),
    };
  } catch (error) {
    return {
      ready: false,
      reason: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
