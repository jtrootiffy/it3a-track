"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  ArrowRight,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner, StatusBadge } from "@/components/ui/field";
import {
  DeleteStudentDialog,
  MarkPaidDialog,
  StudentFormDialog,
} from "@/components/admin/student-dialogs";
import { setPaymentStatus } from "@/lib/actions/students";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatPeso, normalizeName } from "@/lib/format";
import type { AdminSnapshot } from "@/lib/selectors";
import type { AdminStudent } from "@/lib/types";

type Tab = "roster" | "history";
type StatusFilter = "all" | "paid" | "unpaid";
type Toast = { id: string; tone: "success" | "error"; message: string };

export function AdminDashboard({ snapshot }: { snapshot: AdminSnapshot }) {
  const { students, audit, totals } = snapshot;
  const router = useRouter();
  const { toasts, pushToast, dismissToast } = useToasts();

  const [tab, setTab] = useState<Tab>("roster");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminStudent | null>(null);
  const [deleting, setDeleting] = useState<AdminStudent | null>(null);
  const [markingPaid, setMarkingPaid] = useState<AdminStudent | null>(null);

  const filtered = useMemo(() => {
    const needle = normalizeName(query);
    return students.filter((student) => {
      if (filter !== "all" && student.payment_status !== filter) return false;
      if (!needle) return true;
      return normalizeName(student.full_name).includes(needle);
    });
  }, [students, query, filter]);

  async function handleToggle(student: AdminStudent) {
    // Marking paid opens a small dialog so a merit number can be recorded at
    // the same moment. Marking unpaid is immediate and clears the merit number.
    if (student.payment_status === "unpaid") {
      setMarkingPaid(student);
      return;
    }

    setBusyId(student.id);
    const result = await setPaymentStatus({ id: student.id, status: "unpaid" });
    setBusyId(null);

    if (!result.ok) {
      pushToast("error", result.error);
      return;
    }

    pushToast("success", result.message ?? "Payment status updated.");
    router.refresh();
  }

  function handlePaid(message: string) {
    setMarkingPaid(null);
    pushToast("success", message);
    router.refresh();
  }

  function handleSaved(message: string) {
    setCreating(false);
    setEditing(null);
    pushToast("success", message);
    router.refresh();
  }

  function handleDeleted(message: string) {
    setDeleting(null);
    pushToast("success", message);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] sm:text-3xl">
          Payment ledger
        </h1>
        <p className="text-sm text-muted">
          Mark payments, manage the roster, and review every recorded change.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Collected"
          value={formatPeso(totals.collected)}
          hint="₱50 × paid students"
          tone="inverse"
        />
        <StatTile label="Paid" value={String(totals.paid)} hint="Students who have paid" />
        <StatTile label="Unpaid" value={String(totals.unpaid)} hint="Visible to admins only" />
        <StatTile
          label="On the roster"
          value={String(totals.roster)}
          hint="Paid and unpaid combined"
        />
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Ledger views"
          className="inline-flex self-start rounded-control border border-line bg-surface p-1"
        >
          <TabButton
            active={tab === "roster"}
            controls="roster-panel"
            onClick={() => setTab("roster")}
          >
            Roster
          </TabButton>
          <TabButton
            active={tab === "history"}
            controls="history-panel"
            onClick={() => setTab("history")}
          >
            Payment history
          </TabButton>
        </div>

        {tab === "roster" ? (
          <Button onClick={() => setCreating(true)} className="self-start">
            <Plus size={15} weight="bold" aria-hidden="true" />
            Add student
          </Button>
        ) : null}
      </div>

      {tab === "roster" ? (
        <section id="roster-panel" role="tabpanel" aria-label="Roster" className="mt-4">
          <div className="rounded-card border border-line bg-canvas">
            <div className="flex flex-col gap-2.5 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <label htmlFor="roster-search" className="sr-only">
                  Search the roster
                </label>
                <MagnifyingGlass
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="roster-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search students"
                  autoComplete="off"
                  className="h-10 w-full rounded-control border border-line bg-canvas pl-9 pr-9 text-sm text-ink transition-[border-color,box-shadow] placeholder:text-muted/90 focus:border-accent-ink focus:outline-none focus:ring-4 focus:ring-accent/25 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <X size={12} weight="bold" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div
                role="group"
                aria-label="Filter by payment status"
                className="inline-flex self-start rounded-control border border-line bg-surface p-1"
              >
                {(
                  [
                    ["all", "All"],
                    ["paid", "Paid"],
                    ["unpaid", "Unpaid"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={cn(
                      "h-8 rounded-[7px] px-3 text-xs font-medium transition-colors",
                      filter === value
                        ? "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,21,20,0.08)]"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {students.length === 0 ? (
              <EmptyRoster onAdd={() => setCreating(true)} />
            ) : filtered.length === 0 ? (
              <NoMatches
                onClear={() => {
                  setQuery("");
                  setFilter("all");
                }}
              />
            ) : (
              <>
                <div className="hidden lg:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <Th>Student</Th>
                        <Th>Status</Th>
                        <Th>Paid on</Th>
                        <Th>Remarks</Th>
                        <Th align="right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-line/60 align-middle transition-colors last:border-0 hover:bg-surface/70"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink">{student.full_name}</p>
                            {student.merit_number ? (
                              <p className="mt-0.5 font-mono text-[10px] text-muted">
                                Merit no. {student.merit_number}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={student.payment_status} />
                          </td>
                          <td className="tnum whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted">
                            {student.payment_status === "paid"
                              ? formatDate(student.payment_date)
                              : "Not paid"}
                          </td>
                          <td className="max-w-[260px] px-4 py-3">
                            <p className="truncate text-[13px] text-muted">
                              {student.remarks || "None"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <ToggleButton
                                student={student}
                                busy={busyId === student.id}
                                onToggle={handleToggle}
                              />
                              <IconAction
                                label={`Edit ${student.full_name}`}
                                onClick={() => setEditing(student)}
                              >
                                <PencilSimple size={15} aria-hidden="true" />
                              </IconAction>
                              <IconAction
                                label={`Delete ${student.full_name}`}
                                danger
                                onClick={() => setDeleting(student)}
                              >
                                <Trash size={15} aria-hidden="true" />
                              </IconAction>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 p-2.5 lg:hidden">
                  {filtered.map((student) => (
                    <RosterCard
                      key={student.id}
                      student={student}
                      busy={busyId === student.id}
                      onToggle={handleToggle}
                      onEdit={setEditing}
                      onDelete={setDeleting}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section id="history-panel" role="tabpanel" aria-label="Payment history" className="mt-4">
          <div className="rounded-card border border-line bg-canvas">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Payment history</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Who changed what, and when. Newest first.
                </p>
              </div>
              <span className="tnum shrink-0 font-mono text-[11px] text-muted">
                {audit.length} {audit.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {audit.length === 0 ? (
              <EmptyHistory />
            ) : (
              <ul className="divide-y divide-line">
                {audit.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-ink">{entry.student_name}</p>
                        {entry.previous_status ? (
                          <>
                            <StatusBadge status={entry.previous_status} />
                            <ArrowRight
                              size={11}
                              weight="bold"
                              aria-hidden="true"
                              className="text-muted"
                            />
                          </>
                        ) : null}
                        <StatusBadge status={entry.new_status} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {entry.admin_username
                          ? `by ${entry.admin_username}`
                          : "recorded automatically"}
                      </p>
                    </div>
                    <time
                      dateTime={entry.changed_at}
                      className="tnum shrink-0 font-mono text-[11px] text-muted"
                    >
                      {formatDateTime(entry.changed_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {creating ? (
        <StudentFormDialog
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {editing ? (
        <StudentFormDialog
          key={editing.id}
          mode="edit"
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleting ? (
        <DeleteStudentDialog
          key={deleting.id}
          student={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      ) : null}

      {markingPaid ? (
        <MarkPaidDialog
          key={markingPaid.id}
          student={markingPaid}
          onClose={() => setMarkingPaid(null)}
          onPaid={handlePaid}
        />
      ) : null}

      <ToastRegion toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

function StatTile({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "inverse";
}) {
  const inverse = tone === "inverse";

  return (
    <div
      className={cn(
        "rounded-card border p-5",
        inverse ? "border-transparent bg-inverse" : "border-line bg-canvas",
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.14em]",
          inverse ? "text-inverse-ink/55" : "text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-2 font-mono text-3xl font-semibold tracking-[-0.03em]",
          inverse ? "text-accent" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className={cn("mt-1.5 text-[11px]", inverse ? "text-inverse-ink/50" : "text-muted")}>
        {hint}
      </p>
    </div>
  );
}

function TabButton({
  active,
  controls,
  onClick,
  children,
}: {
  active: boolean;
  controls: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "h-8 rounded-[7px] px-3 text-xs font-medium transition-colors",
        active
          ? "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,21,20,0.08)]"
          : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function ToggleButton({
  student,
  busy,
  onToggle,
}: {
  student: AdminStudent;
  busy: boolean;
  onToggle: (student: AdminStudent) => void;
}) {
  const paid = student.payment_status === "paid";

  return (
    <Button
      size="sm"
      variant={paid ? "secondary" : "primary"}
      onClick={() => onToggle(student)}
      disabled={busy}
      className="h-8 px-2.5 text-xs"
    >
      {busy ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : paid ? (
        <ArrowCounterClockwise size={13} weight="bold" aria-hidden="true" />
      ) : (
        <Check size={13} weight="bold" aria-hidden="true" />
      )}
      {paid ? "Mark unpaid" : "Mark paid"}
    </Button>
  );
}

function IconAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-[8px] border border-transparent text-muted transition-colors",
        danger
          ? "hover:border-danger/30 hover:bg-danger-soft hover:text-danger-ink"
          : "hover:border-line hover:bg-surface hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function RosterCard({
  student,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  student: AdminStudent;
  busy: boolean;
  onToggle: (student: AdminStudent) => void;
  onEdit: (student: AdminStudent) => void;
  onDelete: (student: AdminStudent) => void;
}) {
  return (
    <div className="rounded-control border border-line bg-canvas p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{student.full_name}</p>
          <p className="tnum mt-0.5 font-mono text-[11px] text-muted">
            {student.payment_status === "paid"
              ? `Paid ${formatDate(student.payment_date)}`
              : "Not paid"}
          </p>
          {student.merit_number ? (
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              Merit no. {student.merit_number}
            </p>
          ) : null}
        </div>
        <StatusBadge status={student.payment_status} />
      </div>

      {student.remarks ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{student.remarks}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-1.5">
        <ToggleButton student={student} busy={busy} onToggle={onToggle} />
        <IconAction label={`Edit ${student.full_name}`} onClick={() => onEdit(student)}>
          <PencilSimple size={15} aria-hidden="true" />
        </IconAction>
        <IconAction label={`Delete ${student.full_name}`} danger onClick={() => onDelete(student)}>
          <Trash size={15} aria-hidden="true" />
        </IconAction>
      </div>
    </div>
  );
}

function EmptyRoster({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
        <UsersThree size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">The roster is empty.</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted">
        Add the first student to start tracking the ₱50 organizational fee.
      </p>
      <Button onClick={onAdd} size="sm" className="mt-1">
        <Plus size={14} weight="bold" aria-hidden="true" />
        Add student
      </Button>
    </div>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">No students match those filters.</p>
      <p className="max-w-xs text-sm text-muted">Try a different name, or reset the status filter.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
      >
        Reset filters
      </button>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
        <ClockCounterClockwise size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">No payment changes yet.</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted">
        Every paid or unpaid change is recorded here with the administrator&apos;s name and the
        exact time.
      </p>
    </div>
  );
}

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-control border px-3.5 py-3 text-[13px] shadow-[0_12px_40px_-16px_rgba(0,21,20,0.35)]",
            toast.tone === "success"
              ? "border-line bg-canvas text-ink"
              : "border-danger/30 bg-danger-soft text-danger-ink",
          )}
        >
          {toast.tone === "success" ? (
            <CheckCircle
              size={17}
              weight="fill"
              aria-hidden="true"
              className="mt-px shrink-0 text-accent-ink"
            />
          ) : (
            <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-px shrink-0" />
          )}
          <p className="flex-1 leading-relaxed">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-[5px] opacity-60 transition-opacity hover:opacity-100"
          >
            <X size={11} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<number[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: Toast["tone"], message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((previous) => [...previous, { id, tone, message }]);
      const timer = window.setTimeout(() => dismissToast(id), 4200);
      timers.current.push(timer);
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { toasts, pushToast, dismissToast };
}
