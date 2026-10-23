import { ORGANIZATIONAL_FEE } from "./constants";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** ₱1,500 */
export function formatPeso(amount: number): string {
  return pesoFormatter.format(amount).replace(/\u00A0/g, " ");
}

/** Always derived, never stored. */
export function collectedFrom(paidCount: number): number {
  return paidCount * ORGANIZATIONAL_FEE;
}

const DATE_TIME_ZONE = "Asia/Manila";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: DATE_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: DATE_TIME_ZONE,
});

/** Oct 12, 2026 */
export function formatDate(iso: string | null): string {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return dateFormatter.format(date);
}

/** Oct 12, 2026, 3:41 PM */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return dateTimeFormatter.format(date);
}

/** 01, 02, ... used by the leaderboard rail. */
export function formatRank(rank: number): string {
  return rank < 100 ? String(rank).padStart(2, "0") : String(rank);
}

/** Trim, collapse inner whitespace, strip diacritics for forgiving search. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
