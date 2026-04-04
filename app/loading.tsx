export default function Loading() {
  return (
    <div className="min-h-[60vh] max-w-[1128px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-[var(--chip-bg)] rounded-lg max-w-md" />
        <div className="h-24 bg-[var(--chip-bg)]/70 rounded-xl" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-[var(--chip-bg)]/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
