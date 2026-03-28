import React, { Suspense } from "react";
import { getHomeBootstrap } from "@/lib/home/bootstrap";
import HomePageClient from "./_components/HomePageClient";

function PageFallback() {
  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6">
      <p className="text-[var(--muted)] text-sm">Loading…</p>
    </div>
  );
}

export default async function Page() {
  const initial = await getHomeBootstrap();
  return (
    <Suspense fallback={<PageFallback />}>
      <HomePageClient initial={initial} />
    </Suspense>
  );
}
