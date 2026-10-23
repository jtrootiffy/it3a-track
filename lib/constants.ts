export const SITE_NAME = "IT3A - TRACK";
export const SITE_SUBTITLE = "IT3A Organizational Fee Tracker.";

/** Fixed organizational fee, in pesos. Never stored; always derived. */
export const ORGANIZATIONAL_FEE = 50;

/** Public leaderboard sort options. */
export const SORT_OPTIONS = [
  { value: "payment", label: "Payment order" },
  { value: "az", label: "Name A-Z" },
  { value: "za", label: "Name Z-A" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
