"use client";

import React from "react";

type AppShellProps = {
  children: React.ReactNode;
  /** Right column on lg+; hidden on small screens */
  aside?: React.ReactNode;
  /** When false, children span full content width (no grid gap for aside) */
  showAside?: boolean;
};

/**
 * Shared page background and max-width container. Optional right rail on large screens.
 */
export default function AppShell({
  children,
  aside,
  showAside = true,
}: AppShellProps) {
  const hasAside = showAside && aside != null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--page)] pb-24 md:pb-8">
      <div className="max-w-[1128px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {hasAside ? (
          <div className="max-lg:flex max-lg:flex-col-reverse max-lg:gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:gap-8 items-start">
            <div className="min-w-0 w-full">{children}</div>
            <aside className="space-y-4 lg:sticky lg:top-20">{aside}</aside>
          </div>
        ) : (
          <div className="w-full max-w-3xl lg:max-w-none mx-auto">{children}</div>
        )}
      </div>
    </div>
  );
}

/** Single-column inner pages (post, profile, messages) — matches shell padding and bottom safe area. */
export function AppPageContainer({
  children,
  className = "",
  maxWidthClass = "max-w-3xl",
}: {
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
}) {
  return (
    <div
      className={`min-h-[calc(100vh-3.5rem)] bg-[var(--page)] pb-24 md:pb-8 ${className}`}
    >
      <div className="max-w-[1128px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className={`${maxWidthClass} mx-auto w-full`}>{children}</div>
      </div>
    </div>
  );
}
