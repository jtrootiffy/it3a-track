"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Receipt, X } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/ui/field";
import { SORT_OPTIONS, type SortOption } from "@/lib/constants";
import { formatDate, formatRank, normalizeName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PublicStudent } from "@/lib/types";

const shortLabels: Record<SortOption, string> = {
  payment: "Payment",
  az: "A-Z",
  za: "Z-A",
};

/**
 * Public leaderboard. Receives paid rows only; ranks are assigned server-side
 * by payment date and stay attached to a student while searching or sorting.
 */
export function Leaderboard({ students }: { students: PublicStudent[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("payment");

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    const filtered = needle
      ? students.filter((student) => normalizeName(student.full_name).includes(needle))
      : students;

    if (sort === "payment") return filtered;

    const direction = sort === "az" ? 1 : -1;
    return [...filtered].sort(
      (a, b) =>
        direction * a.full_name.localeCompare(b.full_name, "en", { sensitivity: "base" }),
    );
  }, [students, query, sort]);

  return (
    <section aria-labelledby="leaderboard-heading">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            id="leaderboard-heading"
            className="text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]"
          >
            Paid Students
          </h2>
          <p className="mt-1.5 text-sm text-muted">Ranked by payment date, earliest first.</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="student-search" className="sr-only">
              Search paid students by name
            </label>
            <MagnifyingGlass
              size={15}
              weight="bold"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="student-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a name"
              autoComplete="off"
              className="h-10 w-full rounded-control border border-line bg-canvas pl-9 pr-9 text-sm text-ink transition-[border-color,box-shadow] placeholder:text-muted/90 focus:border-accent-ink focus:outline-none focus:ring-4 focus:ring-accent/25 sm:w-60 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={12} weight="bold" />
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label="Sort by"
            className="inline-flex h-10 items-center gap-0.5 self-start rounded-control border border-line bg-surface p-1"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                aria-pressed={sort === option.value}
                aria-label={option.label}
                className={cn(
                  "h-8 rounded-[7px] px-2.5 text-xs font-medium transition-colors",
                  sort === option.value
                    ? "bg-canvas text-ink shadow-[0_1px_2px_rgba(0,21,20,0.08)]"
                    : "text-muted hover:text-ink",
                )}
              >
                {shortLabels[option.value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-card border border-line bg-canvas p-2">
        {students.length === 0 ? (
          <EmptyLedger />
        ) : visible.length === 0 ? (
          <NoMatches query={query} onClear={() => setQuery("")} />
        ) : (
          <ul className="grid lg:grid-cols-2 lg:gap-x-4">
            {visible.map((student) => (
              <li key={student.id}>
                <div className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-surface">
                  <span
                    className={cn(
                      "tnum grid h-8 w-8 shrink-0 place-items-center rounded-[8px] font-mono text-[11px] font-semibold",
                      rankTone(student.rank),
                    )}
                    aria-hidden="true"
                  >
                    {formatRank(student.rank)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {student.full_name}
                  </span>
                  <StatusBadge status="paid" />
                  <time
                    dateTime={student.payment_date ?? undefined}
                    className="hidden w-[86px] shrink-0 text-right font-mono text-[11px] text-muted sm:block"
                  >
                    {formatDate(student.payment_date)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function rankTone(rank: number): string {
  if (rank === 1) return "bg-accent text-[#001514]";
  if (rank <= 3) return "bg-surface-2 text-ink";
  return "border border-line text-muted";
}

function EmptyLedger() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
        <Receipt size={22} weight="regular" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">No payments recorded yet.</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted">
        Paid students appear here as soon as a payment is marked in the admin dashboard.
      </p>
    </div>
  );
}

function NoMatches({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-sm font-medium text-ink">No paid student matches that name.</p>
      <p className="max-w-xs text-sm text-muted">
        Nothing found for <span className="font-medium text-ink">{query}</span>.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface"
      >
        Clear search
      </button>
    </div>
  );
}
