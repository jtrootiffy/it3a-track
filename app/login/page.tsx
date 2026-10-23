import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { LogoMark } from "@/components/ui/button";
import { getAdminProfile, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ACCENT = "#41EAD4";
const INK = "#001514";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string }>;
}) {
  const params = await searchParams;
  const { configured, supabase, user } = await getSessionUser();

  if (configured && supabase && user) {
    const admin = await getAdminProfile(supabase, user.id);
    if (admin) redirect("/admin");
  }

  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/admin";
  const denied = params.denied === "1";

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.02fr_0.98fr]">
      <aside
        className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14"
        style={{ backgroundColor: INK, borderRight: "1px solid #0d3b36" }}
      >
        <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[440px]" />

        <div className="relative flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[13px] font-semibold tracking-tight text-white">IT3A - TRACK</span>
        </div>

        <div className="relative max-w-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>
            Organizational fee
          </p>
          <p className="mt-4 text-[clamp(2.4rem,4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            ₱50
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/60">
            One fee per student, recorded once and visible to the whole class.
          </p>
        </div>

        <p className="relative text-xs text-white/45">Authorized administrators only.</p>
      </aside>

      <main className="flex flex-col px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2.5 lg:hidden">
            <LogoMark />
            <span className="text-[13px] font-semibold tracking-tight">IT3A - TRACK</span>
          </span>
          <Link
            href="/"
            className="text-xs text-muted transition-colors hover:text-ink lg:ml-auto"
          >
            Back to tracker
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">Admin login</h1>
            <p className="mt-1.5 text-sm text-muted">
              Sign in to manage the roster and record payments.
            </p>

            <div className="mt-8">
              <LoginForm next={nextPath} denied={denied} />
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted">
          Administrator accounts are provisioned at deployment. Self-registration is disabled.
        </p>
      </main>
    </div>
  );
}
