/**
 * Instant loading state for every public page. Next.js streams this inside
 * the (public) layout the moment a navigation starts, so clicks respond
 * immediately even when the destination page still has to render — without
 * this, the browser appears frozen until the server answers.
 */
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="h-8 w-2/5 rounded-lg bg-tmt-navy/10" />
        <div className="h-4 w-3/5 rounded bg-tmt-navy/10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-44 rounded-xl bg-tmt-navy/10" />
              <div className="h-4 w-4/5 rounded bg-tmt-navy/10" />
              <div className="h-4 w-3/5 rounded bg-tmt-navy/10" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">Loading…</p>
    </div>
  );
}
