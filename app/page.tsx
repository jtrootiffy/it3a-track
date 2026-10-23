import { ButtonLink } from "@/components/ui/button";
import { Leaderboard } from "@/components/public/leaderboard";
import { SetupNotice } from "@/components/public/setup-notice";
import { SiteHeader } from "@/components/public/site-header";
import { cn } from "@/lib/cn";
import { formatPeso } from "@/lib/format";
import { getPublicLedger } from "@/lib/queries/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const ledger = await getPublicLedger();

  if (!ledger.ready) {
    return <SetupNotice reason={ledger.reason} detail={ledger.detail} />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative">
          <div
            aria-hidden="true"
            className="hero-glow pointer-events-none absolute inset-x-0 -top-10 h-[360px]"
          />

          <div className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-12 sm:pb-16 md:pt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
              <div>
                <h1 className="rise text-[clamp(2.6rem,7vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.045em]">
                  IT3A - TRACK
                </h1>
                <p
                  className="rise mt-4 max-w-md text-base text-muted sm:text-lg"
                  style={{ animationDelay: "90ms" }}
                >
                  IT3A Organizational Fee Tracker.
                </p>
                <div
                  aria-hidden="true"
                  className="rise mt-7 h-px w-20 bg-accent"
                  style={{ animationDelay: "150ms" }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard
                  label="Students Paid"
                  value={String(ledger.paidCount)}
                  delay={140}
                />
                <StatCard
                  label="Collected"
                  value={formatPeso(ledger.collected)}
                  tone="inverse"
                  delay={220}
                  className="lg:ml-10"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-5 pb-20">
          <Leaderboard students={ledger.students} />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-7 sm:flex-row">
          <p className="text-xs text-muted">IT3A Organizational Fee Tracker.</p>
          <ButtonLink
            href="/login"
            variant="ghost"
            size="sm"
            className="border border-line px-3.5"
          >
            Admin Login
          </ButtonLink>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "plain",
  delay = 0,
  className,
}: {
  label: string;
  value: string;
  tone?: "plain" | "inverse";
  delay?: number;
  className?: string;
}) {
  const inverse = tone === "inverse";

  return (
    <div
      className={cn(
        "rise rounded-card border p-6",
        inverse ? "border-transparent bg-inverse" : "border-line bg-surface",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className={cn(
          "tnum font-mono text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-none tracking-[-0.03em]",
          inverse ? "text-accent" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className={cn("mt-3 text-[13px]", inverse ? "text-inverse-ink/70" : "text-muted")}>
        {label}
      </p>
    </div>
  );
}
