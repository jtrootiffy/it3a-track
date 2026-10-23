"use client";

import { useState, type FormEvent } from "react";
import { Check, Trash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Spinner, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { createStudent, deleteStudent, setPaymentStatus, updateStudent } from "@/lib/actions/students";
import { cn } from "@/lib/cn";
import type { AdminStudent, PaymentStatus } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Add / edit                                                                  */
/* -------------------------------------------------------------------------- */

export function StudentFormDialog({
  mode,
  student,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  student?: AdminStudent;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [fullName, setFullName] = useState(student?.full_name ?? "");
  const [remarks, setRemarks] = useState(student?.remarks ?? "");
  const [status, setStatus] = useState<PaymentStatus>(student?.payment_status ?? "unpaid");
  const [meritNumber, setMeritNumber] = useState(student?.merit_number ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editing = mode === "edit" && Boolean(student);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fullName.trim().length < 2) {
      setError("Enter the student's full name.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = editing
      ? await updateStudent({
          id: student!.id,
          fullName,
          remarks,
          status,
          meritNumber: status === "paid" ? meritNumber : "",
        })
      : await createStudent({
          fullName,
          remarks,
          status,
          meritNumber: status === "paid" ? meritNumber : "",
        });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved(result.message ?? "Saved.");
  }

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={editing ? "Edit student" : "Add a student"}
      description={
        editing
          ? "Changes are saved to the database immediately."
          : "Add a classmate to the roster. The fee is fixed at ₱50."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-[13px] leading-relaxed text-danger-ink"
          >
            <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <Field label="Full name" htmlFor="student-name">
          <Input
            id="student-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Juan Miguel Dela Cruz"
            autoComplete="off"
            maxLength={120}
            disabled={busy}
            required
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">Payment status</span>
          <div
            role="group"
            aria-label="Payment status"
            className="grid grid-cols-2 gap-1 rounded-control border border-line bg-surface p-1"
          >
            <button
              type="button"
              onClick={() => {
                setStatus("unpaid");
                setMeritNumber("");
              }}
              aria-pressed={status === "unpaid"}
              disabled={busy}
              className={cn(
                "h-9 rounded-[7px] text-[13px] font-medium transition-colors",
                status === "unpaid"
                  ? "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,21,20,0.08)]"
                  : "text-muted hover:text-ink",
              )}
            >
              Unpaid
            </button>
            <button
              type="button"
              onClick={() => setStatus("paid")}
              aria-pressed={status === "paid"}
              disabled={busy}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-[7px] text-[13px] font-medium transition-colors",
                status === "paid"
                  ? "bg-accent text-[#001514]"
                  : "text-muted hover:text-ink",
              )}
            >
              {status === "paid" ? <Check size={12} weight="bold" aria-hidden="true" /> : null}
              Paid
            </button>
          </div>
          <p className="text-xs text-muted">
            {status === "paid"
              ? "The payment date is stamped automatically and ₱50 is added to the total."
              : "No payment is recorded for this student."}
          </p>
        </div>

        <Field
          label="Merit number"
          htmlFor="student-merit"
          hint={
            status === "paid"
              ? "Optional. The merit card number issued with this payment."
              : "Only a paid student can have a merit number."
          }
        >
          <Input
            id="student-merit"
            value={meritNumber}
            onChange={(event) => setMeritNumber(event.target.value)}
            placeholder="e.g. MC-0142"
            autoComplete="off"
            maxLength={40}
            disabled={busy || status !== "paid"}
          />
        </Field>

        <Field label="Remarks" htmlFor="student-remarks" hint="Optional. Visible to administrators only.">
          <Textarea
            id="student-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Paid in cash at the classroom."
            rows={3}
            maxLength={600}
            disabled={busy}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : null}
            {editing ? "Save changes" : "Add student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Mark paid                                                                   */
/* -------------------------------------------------------------------------- */

export function MarkPaidDialog({
  student,
  onClose,
  onPaid,
}: {
  student: AdminStudent;
  onClose: () => void;
  onPaid: (message: string) => void;
}) {
  const [meritNumber, setMeritNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await setPaymentStatus({
      id: student.id,
      status: "paid",
      meritNumber,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onPaid(result.message ?? "Payment recorded.");
  }

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title="Mark as paid"
      description="₱50 is added to the collection and today's date is stamped automatically."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="rounded-control border border-line bg-surface px-3.5 py-3">
          <p className="text-sm font-medium text-ink">{student.full_name}</p>
          <p className="mt-0.5 text-xs text-muted">Currently marked unpaid.</p>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger-soft px-3.5 py-3 text-[13px] leading-relaxed text-danger-ink"
          >
            <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <Field
          label="Merit number"
          htmlFor="mark-paid-merit"
          hint="Optional. Leave blank if no merit card was issued."
        >
          <Input
            id="mark-paid-merit"
            value={meritNumber}
            onChange={(event) => setMeritNumber(event.target.value)}
            placeholder="e.g. MC-0142"
            autoComplete="off"
            maxLength={40}
            disabled={busy}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner /> : <Check size={15} weight="bold" aria-hidden="true" />}
            Mark as paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Delete confirmation                                                         */
/* -------------------------------------------------------------------------- */

export function DeleteStudentDialog({
  student,
  onClose,
  onDeleted,
}: {
  student: AdminStudent;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(null);

    const result = await deleteStudent({ id: student.id });

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onDeleted(result.message ?? "Student removed.");
  }

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title="Delete this student?"
      description="This cannot be undone. The student disappears from the roster and the public leaderboard."
    >
      <div className="rounded-control border border-line bg-surface px-3.5 py-3">
        <p className="text-sm font-medium text-ink">{student.full_name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {student.payment_status === "paid"
            ? "Currently marked paid. The ₱50 will be removed from the total."
            : "Currently marked unpaid."}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-danger-ink">
          <WarningCircle size={16} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
          Keep student
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete} disabled={busy}>
          {busy ? <Spinner /> : <Trash size={15} weight="bold" aria-hidden="true" />}
          Delete record
        </Button>
      </div>
    </Modal>
  );
}
