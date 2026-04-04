export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="h-8 w-40 bg-[var(--chip-bg)] rounded-lg mb-4 motion-safe:animate-pulse" />
      <ul className="divide-y divide-[var(--border)] card-surface overflow-hidden shadow-sm">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="px-4 py-3 flex gap-4 min-h-[56px]">
            <div className="w-10 h-10 rounded-full bg-[var(--chip-bg)] motion-safe:animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 py-1 min-w-0">
              <div className="h-4 bg-[var(--chip-bg)]/80 rounded w-1/3 motion-safe:animate-pulse" />
              <div className="h-3 bg-[var(--chip-bg)]/60 rounded w-4/5 motion-safe:animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
