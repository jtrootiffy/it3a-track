export type PaymentStatus = "paid" | "unpaid";

/** Row as exposed to the public page. `remarks` must never appear here. */
export type PublicStudent = {
  id: string;
  full_name: string;
  payment_status: PaymentStatus;
  payment_date: string | null;
  created_at: string;
  /** 1-based position by payment date. Computed server-side, stable under search. */
  rank: number;
};

/** Full row, administrator-only. */
export type AdminStudent = {
  id: string;
  full_name: string;
  payment_status: PaymentStatus;
  payment_date: string | null;
  remarks: string;
  created_at: string;
  updated_at: string;
};

export type AuditEntry = {
  id: number;
  student_id: string;
  student_name: string;
  admin_username: string | null;
  previous_status: PaymentStatus | null;
  new_status: PaymentStatus;
  changed_at: string;
};

export type AdminProfile = {
  id: string;
  username: string;
  full_name: string;
};

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };
