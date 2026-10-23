"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretLeft, CaretRight, MagnifyingGlass, Receipt, X } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/ui/field";
import { formatDate, formatRank, normalizeName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PublicStudent } from "@/lib/types";

const PAGE_SIZE = 10;

/**
 * Public leaderboard. Sorted A-Z, paginated in groups of 10 with next/previous arrows.
 */
export function Leaderboard({ students }: { students: PublicStudent[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const needle = normalizeName(query);
    const filtered = needle
      ? students.filter(
          (student) =>
            normalizeName(student.full_name).includes(needle) ||
            normalizeName(student.merit_number ?? "").includes(needle),
        )
      : [...students];

    return filtered.sort((a, b) =>
      a.full_name.localeCompare(b.full_name, "en", { sensitivity: "base" }),
    );
  }, [students, query]);

  useEffect(() => {
    setPage(0);
  }, [query, sorted.length]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const startIndex = safePage * PAGE_SIZE;
  const visible = sorted.slice(startIndex, startIndex + PAGE_SIZE);

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
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="student-search" className="sr-only">
              Search paid students by name or merit number
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
              placeholder="Name or merit no."
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
        </div>
      </div>

      <div className="mt-6 rounded-card border border-line bg-canvas p-2">
        {students.length === 0 ? (
          <EmptyLedger />
        ) : sorted.length === 0 ? (
          <NoMatches query={query} onClear={() => setQuery("")} />
        ) : (
          <>
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {student.full_name}
                      </span>
                      {student.merit_number ? (
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
                          Merit no. {student.merit_number}
                        </span>
                      ) : null}
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
            {sorted.length > PAGE_SIZE ? (
              <div className="mt-2 flex items-center justify-between border-t border-line px-3 py-2">
                <p className="text-xs text-muted">
                  {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, sorted.length)} of{" "}
                  {sorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    aria-label="Previous page"
                    className="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CaretLeft size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
                    aria-label="Next page"
                    className="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CaretRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ) : null}
          </>
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
      <p className="text-sm font-medium text-ink">No paid student matches that search.</p>
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
