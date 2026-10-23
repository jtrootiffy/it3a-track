"use client";

import type { ComponentProps, ReactNode } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { PaymentStatus } from "@/lib/types";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-control border border-line bg-canvas px-3 text-sm text-ink",
        "placeholder:text-muted/90",
        "transition-[border-color,box-shadow] duration-150",
        "focus:border-accent-ink focus:outline-none focus:ring-4 focus:ring-accent/25",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-control border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink",
        "placeholder:text-muted/90",
        "transition-[border-color,box-shadow] duration-150",
        "focus:border-accent-ink focus:outline-none focus:ring-4 focus:ring-accent/25",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#001514]">
        <Check size={10} weight="bold" aria-hidden="true" />
        Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
      Unpaid
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}
