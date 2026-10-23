export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-10">
      <div className="skeleton h-8 w-56 rounded" />
      <div className="skeleton mt-3 h-4 w-80 rounded" />

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-[118px] rounded-card" />
        ))}
      </div>

      <div className="mt-9 flex items-center justify-between">
        <div className="skeleton h-10 w-64 rounded-control" />
        <div className="skeleton h-11 w-32 rounded-control" />
      </div>

      <div className="mt-4 rounded-card border border-line p-3">
        <div className="skeleton h-10 w-full rounded-control" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="skeleton h-12 rounded-control" />
          ))}
        </div>
      </div>
    </div>
  );
}
