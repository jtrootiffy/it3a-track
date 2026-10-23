import { Wordmark } from "@/components/ui/button";
import { ORGANIZATIONAL_FEE } from "@/lib/constants";
import { formatPeso } from "@/lib/format";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
        <Wordmark />
        <p className="text-xs text-muted">
          Organizational fee{" "}
          <span className="tnum font-mono text-[12px] font-medium text-ink">
            {formatPeso(ORGANIZATIONAL_FEE)}
          </span>
        </p>
      </div>
    </header>
  );
}
