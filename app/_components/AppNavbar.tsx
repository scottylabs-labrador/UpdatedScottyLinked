"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  MessageCircle,
  Shield,
  Home,
  Briefcase,
  Users,
} from "lucide-react";
import logo from "../147268137.png";
import { signInWithGoogle } from "@/app/auth/login/actions";
import { createClient } from "@/lib/supabase/client";
import { useHomeTab } from "./HomeTabNav";
import type { HomeTab } from "@/lib/homeTab";

interface AppUser {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  isModerator?: boolean;
}

function AppNavbarInner({
  initialAppUser,
}: {
  initialAppUser: AppUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeHomeTab, setHomeTab } = useHomeTab();
  const [appUser, setAppUser] = useState<AppUser | null>(initialAppUser);
  const [authLoading, setAuthLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<{
    items: Array<{
      id: number;
      title: string;
      body: string | null;
      read_at: string | null;
      created_at: string;
    }>;
    unread: number;
  } | null>(null);

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setNotifData(data);
      })
      .catch(() => {});
  }, []);

  const onMessages = pathname.startsWith("/messages");
  const onAdmin = pathname.startsWith("/admin");

  const isHomeTabActive = (t: HomeTab) =>
    pathname === "/" &&
    !onMessages &&
    !onAdmin &&
    (t === "feed" ? activeHomeTab === "feed" : activeHomeTab === t);

  useEffect(() => {
    setAppUser(initialAppUser);
  }, [initialAppUser]);

  useEffect(() => {
    if (!appUser) return;
    router.prefetch("/");
    router.prefetch("/messages");
  }, [appUser, router]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setAuthLoading(true);
      fetch("/api/me", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (data.appUser) {
            setAppUser({
              id: data.appUser.id,
              handle: data.appUser.handle,
              fullName: data.appUser.fullName,
              photoURL: data.appUser.photoURL,
              isModerator: data.appUser.isModerator,
            });
          } else setAppUser(null);
        })
        .finally(() => setAuthLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!appUser) {
      setNotifData(null);
      return;
    }
    loadNotifications();
    const id = setInterval(loadNotifications, 120_000);
    return () => clearInterval(id);
  }, [appUser, loadNotifications]);

  useEffect(() => {
    if (!appUser) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${appUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${appUser.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appUser, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    const unreadIds =
      notifData?.items.filter((n) => n.read_at == null).map((n) => n.id) ?? [];
    if (unreadIds.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: unreadIds }),
    });
    loadNotifications();
  };

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result.url) window.location.href = result.url;
  };

  const navHomePill = (
    tab: HomeTab,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    active: boolean
  ) => {
    const className = `inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
      active
        ? "text-[var(--brand)] bg-blue-50"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    }`;
    const href = tab === "feed" ? "/" : `/?tab=${tab}`;
    if (pathname === "/") {
      return (
        <button
          type="button"
          onClick={() => setHomeTab(tab)}
          className={className}
        >
          <Icon className="w-4 h-4 shrink-0 opacity-80" />
          <span className="hidden xl:inline">{label}</span>
        </button>
      );
    }
    return (
      <Link href={href} className={className}>
        <Icon className="w-4 h-4 shrink-0 opacity-80" />
        <span className="hidden xl:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md">
      <div className="max-w-[1128px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            {pathname === "/" ? (
              <button
                type="button"
                onClick={() => setHomeTab("feed")}
                className="flex items-center gap-2 sm:gap-3 shrink-0 rounded-lg"
              >
                <Image
                  src={logo}
                  alt="ScottyLinked"
                  width={36}
                  height={36}
                  className="rounded-lg object-cover"
                />
                <span className="text-lg font-bold text-gray-900 hidden sm:inline truncate">
                  ScottyLinked
                </span>
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Image
                  src={logo}
                  alt="ScottyLinked"
                  width={36}
                  height={36}
                  className="rounded-lg object-cover"
                />
                <span className="text-lg font-bold text-gray-900 hidden sm:inline truncate">
                  ScottyLinked
                </span>
              </Link>
            )}
          </div>

          {/* Desktop primary nav — hidden on small screens (use MobileTabBar) */}
          <nav
            className="hidden md:flex items-center justify-center gap-0.5 flex-1 min-w-0 px-2"
            aria-label="Main"
          >
            {navHomePill("feed", "Feed", Home, isHomeTabActive("feed"))}
            {navHomePill(
              "groups",
              "Groups",
              Briefcase,
              isHomeTabActive("groups")
            )}
            {navHomePill(
              "network",
              "Network",
              Users,
              isHomeTabActive("network")
            )}
            <Link
              href="/messages"
              prefetch
              className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                onMessages
                  ? "text-[var(--brand)] bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <MessageCircle className="w-4 h-4 shrink-0 opacity-80" />
              <span className="hidden xl:inline">Messages</span>
            </Link>
            {appUser?.isModerator && (
              <Link
                href="/admin/reports"
                className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                  onAdmin
                    ? "text-[var(--brand)] bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Shield className="w-4 h-4 shrink-0 opacity-80" />
                <span className="hidden xl:inline">Moderation</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {authLoading ? (
              <span className="text-sm text-[var(--muted)] px-2">…</span>
            ) : appUser ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen((o) => !o);
                      if (!notifOpen) loadNotifications();
                    }}
                    className="relative p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {(notifData?.unread ?? 0) > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                        {notifData!.unread > 9 ? "9+" : notifData!.unread}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-1 w-[min(100vw-2rem,20rem)] max-h-96 overflow-y-auto bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-lg z-50 py-2">
                      <div className="flex items-center justify-between px-3 pb-2 border-b border-[var(--border)]">
                        <span className="text-sm font-semibold text-gray-900">
                          Notifications
                        </span>
                        {(notifData?.unread ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs text-[var(--brand)] hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {!notifData?.items?.length ? (
                        <p className="px-3 py-8 text-sm text-[var(--muted)] text-center">
                          No notifications yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {notifData.items.map((n) => (
                            <li
                              key={n.id}
                              className={`px-3 py-2.5 text-sm ${
                                n.read_at == null ? "bg-blue-50/40" : ""
                              }`}
                            >
                              <p className="font-medium text-gray-900">
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="text-[var(--muted)] mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                {/* Messages icon on small screens when bottom bar not showing on other pages */}
                <Link
                  href="/messages"
                  className={`md:hidden p-2.5 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    onMessages
                      ? "text-[var(--brand)] bg-blue-50"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  aria-label="Messages"
                >
                  <MessageCircle className="w-5 h-5" />
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand)] rounded-lg hover:bg-[var(--brand-hover)] min-h-[40px]"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AppNavbar({
  initialAppUser,
}: {
  initialAppUser: AppUser | null;
}) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]" />
      }
    >
      <AppNavbarInner initialAppUser={initialAppUser} />
    </Suspense>
  );
}
