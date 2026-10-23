import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------------
   Shape system (documented, applied everywhere)
     cards      16px  -> rounded-card
     controls   10px  -> rounded-control
     badges     pill  -> rounded-full
--------------------------------------------------------------------------- */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-55";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-[#001514] shadow-[0_1px_0_rgba(0,21,20,0.08),inset_0_0_0_1px_rgba(0,21,20,0.06)] hover:brightness-[1.04]",
  secondary:
    "border border-line bg-canvas text-ink hover:border-accent-ink/40 hover:bg-surface",
  ghost: "text-muted hover:bg-surface hover:text-ink",
  danger: "bg-danger text-white hover:brightness-[1.06]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-accent font-mono text-[10px] font-bold tracking-tight text-[#001514]",
        className,
      )}
    >
      3A
    </span>
  );
}

export function Wordmark({ subtle = false }: { subtle?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span
        className={cn(
          "text-[13px] font-semibold tracking-[-0.01em]",
          subtle ? "text-muted" : "text-ink",
        )}
      >
        IT3A - TRACK
      </span>
    </span>
  );
}
