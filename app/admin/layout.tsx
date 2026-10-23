import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Wordmark } from "@/components/ui/button";
import { getAdminProfile, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { configured, supabase, user } = await getSessionUser();

  if (!configured) redirect("/");
  if (!supabase || !user) redirect("/login?next=/admin");

  const admin = await getAdminProfile(supabase, user.id);
  if (!admin) redirect("/login?denied=1");

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-2.5">
            <Wordmark />
            <span className="hidden rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted sm:inline">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium leading-tight text-ink">{admin.full_name}</p>
              <p className="font-mono text-[11px] leading-tight text-muted">{admin.username}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
