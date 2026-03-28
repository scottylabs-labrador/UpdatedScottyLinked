"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Briefcase, Users, MessageCircle } from "lucide-react";

/**
 * Fixed bottom navigation for primary app sections.
 * Shown on home and messages routes so users can jump between sections.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onHome = pathname === "/";
  const onMessages = pathname.startsWith("/messages");
  const onGroupsPage = pathname.startsWith("/groups");
  if (!onHome && !onMessages && !onGroupsPage) return null;

  const tab = onHome ? searchParams.get("tab") || "feed" : null;

  const item = (
    href: string,
    label: string,
    icon: React.ReactNode,
    active: boolean
  ) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[48px] rounded-lg transition-colors ${
        active
          ? "text-[var(--brand)]"
          : "text-[var(--muted)] hover:text-gray-800"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[10px] font-medium truncate max-w-full px-0.5">
        {label}
      </span>
    </Link>
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1 pt-1">
        {item("/", "Feed", <Home className="w-5 h-5" />, onHome && tab === "feed")}
        {item(
          "/?tab=groups",
          "Groups",
          <Briefcase className="w-5 h-5" />,
          (onHome && (tab === "groups" || tab === "opportunities")) ||
            onGroupsPage
        )}
        {item(
          "/?tab=network",
          "Network",
          <Users className="w-5 h-5" />,
          onHome && tab === "network"
        )}
        {item(
          "/messages",
          "Messages",
          <MessageCircle className="w-5 h-5" />,
          onMessages
        )}
      </div>
    </nav>
  );
}
