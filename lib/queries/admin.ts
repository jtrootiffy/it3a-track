import { getAdminProfile, getSessionUser } from "@/lib/auth";
import { summarize, type AdminSnapshot } from "@/lib/selectors";
import type { AdminStudent, AuditEntry } from "@/lib/types";

/**
 * Full roster + audit log for the dashboard. Only reachable by an administrator
 * because both the session check here and the RLS policies re-verify the row in
 * it3a_admins.
 */
export async function getAdminSnapshot(): Promise<
  | { ok: true; snapshot: AdminSnapshot }
  | { ok: false; error: string; reason: "unconfigured" | "signed-out" | "not-admin" | "error" }
> {
  const { configured, supabase, user } = await getSessionUser();

  if (!configured || !supabase) {
    return { ok: false, error: "This deployment is not connected to a database yet.", reason: "unconfigured" };
  }
  if (!user) {
    return { ok: false, error: "Sign in to continue.", reason: "signed-out" };
  }

  const admin = await getAdminProfile(supabase, user.id);
  if (!admin) {
    return { ok: false, error: "This account does not have administrator access.", reason: "not-admin" };
  }

  const [studentsResult, auditResult] = await Promise.all([
    supabase
      .from("it3a_students")
      .select(
        "id, full_name, payment_status, payment_date, remarks, merit_number, created_at, updated_at",
      )
      .order("full_name", { ascending: true }),
    supabase
      .from("it3a_payment_audit_log")
      .select("id, student_id, student_name, admin_username, previous_status, new_status, changed_at")
      .order("changed_at", { ascending: false })
      .limit(200),
  ]);

  if (studentsResult.error) {
    return { ok: false, error: studentsResult.error.message, reason: "error" };
  }

  const students = (studentsResult.data ?? []) as AdminStudent[];
  const audit = (auditResult.data ?? []) as AuditEntry[];

  return {
    ok: true,
    snapshot: { admin, students, audit, totals: summarize(students) },
  };
}
