import { SiteHeader } from "@/components/public/site-header";

export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-12 md:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <div>
              <div className="skeleton h-14 w-[min(420px,80%)] rounded-lg sm:h-16" />
              <div className="skeleton mt-5 h-5 w-64 rounded" />
              <div className="skeleton mt-7 h-px w-20 rounded" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="skeleton h-[118px] rounded-card" />
              <div className="skeleton h-[118px] rounded-card lg:ml-10" />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="skeleton h-7 w-44 rounded" />
              <div className="skeleton mt-2.5 h-4 w-64 rounded" />
            </div>
            <div className="flex gap-2.5">
              <div className="skeleton h-10 w-60 rounded-control" />
              <div className="skeleton h-10 w-40 rounded-control" />
            </div>
          </div>
          <div className="mt-6 rounded-card border border-line p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton my-1 h-12 rounded-[12px]" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
