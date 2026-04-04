import React, { Suspense } from "react";
import { getHomeBootstrap } from "@/lib/home/bootstrap";
import HomePageClient from "./_components/HomePageClient";

function PageFallback() {
  return (
    <div className="min-h-[60vh] max-w-[1128px] mx-auto px-3 sm:px-4 lg:px-6 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200/80 rounded-lg max-w-md" />
        <div className="h-24 bg-gray-200/60 rounded-xl" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-gray-200/50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function HomeWithData() {
  const initial = await getHomeBootstrap();
  return <HomePageClient initial={initial} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageFallback />}>
      <HomeWithData />
    </Suspense>
  );
}
