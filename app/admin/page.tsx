import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/dashboard";
import { ButtonLink } from "@/components/ui/button";
import { getAdminSnapshot } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await getAdminSnapshot();

  if (!result.ok) {
    if (result.reason === "signed-out") redirect("/login?next=/admin");
    if (result.reason === "not-admin") redirect("/login?denied=1");
    if (result.reason === "unconfigured") redirect("/");

    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Could not load the ledger</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{result.error}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          If the tables are missing, run{" "}
          <code className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[12px] text-ink">
            npm run migrate
          </code>{" "}
          and reload this page.
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          Back to tracker
        </ButtonLink>
      </div>
    );
  }

  return <AdminDashboard snapshot={result.snapshot} />;
}
