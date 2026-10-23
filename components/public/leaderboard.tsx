"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, Receipt, X } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/ui/field";
import { formatDate, formatRank, normalizeName } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PublicStudent } from "@/lib/types";

const ROW_HEIGHT = 56;

/**
 * Public leaderboard. Auto-scrolls A-Z and loops.
 */
export function Leaderboard({ students }: { students: PublicStudent[] }) {
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

  const displayList = useMemo(() => {
    if (sorted.length === 0) return [];
    if (!query && !prefersReducedMotion) {
      return [...sorted, ...sorted, ...sorted];
    }
    return sorted;
  }, [sorted, query, prefersReducedMotion]);

  useEffect(() => {
    setPaused(false);
    positionRef.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = "translateY(0px)";
    }
  }, [query, sorted.length]);

  useEffect(() => {
    if (
      students.length === 0 ||
      sorted.length === 0 ||
      query ||
      prefersReducedMotion
    ) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (trackRef.current) {
        trackRef.current.style.transform = "translateY(0px)";
      }
      positionRef.current = 0;
      return;
    }

    const speed = 0.7;

    const step = () => {
      if (pausedRef.current || !containerRef.current || !trackRef.current) {
        animationRef.current = requestAnimationFrame(step);
        return;
      }

      positionRef.current += speed;

      const trackHeight = trackRef.current.scrollHeight;
      const sectionHeight = trackHeight / 3;
      const maxScroll = Math.max(0, sectionHeight);

      if (maxScroll > 0 && positionRef.current >= maxScroll) {
        positionRef.current -= maxScroll;
      }

      trackRef.current.style.transform = `translateY(-${positionRef.current}px)`;
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [query, sorted.length, prefersReducedMotion]);

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
        ) : !query && !prefersReducedMotion ? (
          <div
            ref={containerRef}
            className="relative h-[448px] overflow-hidden cursor-pointer select-none"
            role="region"
            aria-label="Paid students leaderboard scrolling A to Z. Hold or click to pause."
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            onTouchCancel={() => setPaused(false)}
          >
            <div
              ref={trackRef}
              className="will-change-transform"
              style={{ transform: "translateY(0px)" }}
            >
              {displayList.map((student, index) => (
                <div
                  key={`${student.id}-${index}`}
                  className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors hover:bg-surface"
                  style={{ height: ROW_HEIGHT }}
                >
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
              ))}
            </div>
          </div>
        ) : (
          <ul className="grid lg:grid-cols-2 lg:gap-x-4">
            {sorted.map((student) => (
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
