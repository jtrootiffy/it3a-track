import type { AdminProfile, AdminStudent, AuditEntry, PaymentStatus, PublicStudent } from "./types";
import { collectedFrom } from "./format";

/** Shape returned by the anon query in lib/queries/public.ts. */
export type PublicLedgerRow = {
  id: string;
  full_name: string;
  payment_status: PaymentStatus;
  payment_date: string | null;
  created_at: string;
};

export type AdminSnapshot = {
  admin: AdminProfile;
  students: AdminStudent[];
  audit: AuditEntry[];
  totals: {
    paid: number;
    unpaid: number;
    roster: number;
    collected: number;
  };
};

export function withRanks(rows: PublicLedgerRow[]): PublicStudent[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function summarize(students: AdminStudent[]) {
  const paid = students.filter((student) => student.payment_status === "paid").length;
  return {
    paid,
    unpaid: students.length - paid,
    roster: students.length,
    collected: collectedFrom(paid),
  };
}
