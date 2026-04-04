export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6">
      <div className="h-4 w-20 bg-gray-200/70 rounded mb-4 motion-safe:animate-pulse" />
      <div className="flex gap-3 mb-4 pb-3 border-b border-[var(--border)]">
        <div className="w-10 h-10 rounded-full bg-gray-200/80 motion-safe:animate-pulse" />
        <div className="h-6 flex-1 max-w-[200px] bg-gray-200/70 rounded motion-safe:animate-pulse mt-2" />
      </div>
      <div className="space-y-3 mb-4 min-h-[200px]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div
              className="h-14 max-w-[70%] rounded-2xl bg-gray-200/70 motion-safe:animate-pulse"
              style={{ width: `${55 + (i % 3) * 10}%` }}
            />
          </div>
        ))}
      </div>
      <div className="h-12 bg-gray-200/50 rounded-xl motion-safe:animate-pulse" />
    </div>
  );
}
