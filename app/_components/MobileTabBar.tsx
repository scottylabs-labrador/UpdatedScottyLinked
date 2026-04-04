"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, Briefcase, Users, MessageCircle } from "lucide-react";
import { useHomeTab } from "./HomeTabNav";
import type { HomeTab } from "@/lib/homeTab";

/**
 * Fixed bottom navigation for primary app sections.
 * Shown on home and messages routes so users can jump between sections.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeHomeTab, setHomeTab } = useHomeTab();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/messages");
  }, [router]);

  const onHome = pathname === "/";
  const onMessages = pathname.startsWith("/messages");
  const onGroupsPage = pathname.startsWith("/groups");
  if (!onHome && !onMessages && !onGroupsPage) return null;

  const homeItem = (
    tab: HomeTab,
    label: string,
    icon: React.ReactNode,
    active: boolean
  ) => {
    const className = `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[48px] rounded-lg transition-colors ${
      active
        ? "text-[var(--brand)]"
        : "text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;
    if (onHome) {
      return (
        <button
          type="button"
          onClick={() => setHomeTab(tab)}
          className={className}
          aria-current={active ? "page" : undefined}
        >
          <span className="shrink-0">{icon}</span>
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            {label}
          </span>
        </button>
      );
    }
    const href = tab === "feed" ? "/" : `/?tab=${tab}`;
    return (
      <Link href={href} className={className} aria-current={active ? "page" : undefined}>
        <span className="shrink-0">{icon}</span>
        <span className="text-[10px] font-medium truncate max-w-full px-0.5">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1 pt-1">
        {homeItem("feed", "Feed", <Home className="w-5 h-5" />, onHome && activeHomeTab === "feed")}
        {homeItem(
          "groups",
          "Groups",
          <Briefcase className="w-5 h-5" />,
          (onHome && activeHomeTab === "groups") || onGroupsPage
        )}
        {homeItem(
          "network",
          "Network",
          <Users className="w-5 h-5" />,
          onHome && activeHomeTab === "network"
        )}
        <Link
          href="/messages"
          prefetch
          className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[48px] rounded-lg transition-colors ${
            onMessages
              ? "text-[var(--brand)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          aria-current={onMessages ? "page" : undefined}
        >
          <span className="shrink-0">
            <MessageCircle className="w-5 h-5" />
          </span>
          <span className="text-[10px] font-medium truncate max-w-full px-0.5">
            Messages
          </span>
        </Link>
      </div>
    </nav>
  );
}
