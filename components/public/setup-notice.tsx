import { SiteHeader } from "@/components/public/site-header";

const STEPS = [
  {
    title: "Add your Supabase credentials",
    body: "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL.",
    code: "cp .env.example .env.local",
  },
  {
    title: "Create the tables and policies",
    body: "Applies the schema, the audit triggers and the Row Level Security policies.",
    code: "npm run migrate",
  },
  {
    title: "Provision the two administrators",
    body: "Creates dexter.gravoso and troy.lagahit in Supabase Auth and links them to the admin table.",
    code: "npm run setup:admins",
  },
  {
    title: "Start the app",
    body: "Open http://localhost:3000 for the public board and http://localhost:3000/login for admin access.",
    code: "npm run dev",
  },
];

export function SetupNotice({
  reason,
  detail,
}: {
  reason: "unconfigured" | "schema" | "unreachable";
  detail?: string;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-16 sm:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-ink">
          Setup required
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {reason === "unconfigured"
            ? "The ledger is not connected yet."
            : "The ledger tables are missing."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {reason === "unconfigured"
            ? "This deployment has no Supabase project attached. Follow the steps below, then reload this page."
            : "Supabase answered, but the IT3A tables or policies could not be read. Apply the migrations below, then reload this page."}
        </p>

        <ol className="mt-9 space-y-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="tnum mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-surface font-mono text-[11px] font-semibold text-muted">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                <code className="mt-2.5 block overflow-x-auto rounded-control border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink">
                  {step.code}
                </code>
              </div>
            </li>
          ))}
        </ol>

        {detail ? (
          <pre className="mt-8 overflow-x-auto rounded-control border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted">
            {detail}
          </pre>
        ) : null}
      </main>
    </div>
  );
}
