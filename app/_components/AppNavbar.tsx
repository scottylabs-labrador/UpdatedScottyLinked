"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import logo from "../147268137.png";
import Avatar from "./Avatar";
import { signInWithGoogle, signOut } from "@/app/auth/login/actions";

interface AppUser {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  isModerator?: boolean;
}

function AppNavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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

  const loadNotifications = () => {
    fetch("/api/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setNotifData(data);
      })
      .catch(() => {});
  };

  const tab = pathname === "/" ? searchParams.get("tab") : null;
  const activeTab = tab === "opportunities" || tab === "network" || tab === "profile" ? tab : "feed";
  const onProfilePage = pathname.startsWith("/profile/");
  const onMessages = pathname.startsWith("/messages");
  const onAdmin = pathname.startsWith("/admin");

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!appUser) {
      setNotifData(null);
      return;
    }
    loadNotifications();
    const id = setInterval(loadNotifications, 60_000);
    return () => clearInterval(id);
  }, [appUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
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

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await signOut();
    setAppUser(null);
  };

  const navLink = (label: string, href: string, isActive: boolean) => (
    <Link
      href={href}
      className={`px-4 py-2 font-semibold transition-all text-sm ${
        isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={logo}
                alt="ScottyLinked Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
              <span className="text-xl font-bold text-gray-900">ScottyLinked</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex flex-wrap gap-1 items-center">
              {navLink("Feed", "/", !onProfilePage && !onMessages && !onAdmin && activeTab === "feed")}
              {navLink("Opportunities", "/?tab=opportunities", !onProfilePage && !onMessages && !onAdmin && activeTab === "opportunities")}
              {navLink("Network", "/?tab=network", !onProfilePage && !onMessages && !onAdmin && activeTab === "network")}
              {navLink("Profile", "/?tab=profile", (!onProfilePage && !onMessages && !onAdmin && activeTab === "profile") || (onProfilePage && !pathname.includes("/h/")))}
              <Link
                href="/messages"
                className={`px-4 py-2 font-semibold transition-all text-sm ${
                  onMessages ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Messages
              </Link>
              {appUser?.isModerator && (
                <Link
                  href="/admin/reports"
                  className={`px-4 py-2 font-semibold transition-all text-sm ${
                    onAdmin ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Moderation
                </Link>
              )}
            </nav>
            <div className="flex items-center gap-2">
              {authLoading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : appUser ? (
                <>
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen((o) => !o);
                      if (!notifOpen) loadNotifications();
                    }}
                    className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Notifications"
                  >
                    <span className="text-lg">🔔</span>
                    {(notifData?.unread ?? 0) > 0 && (
                      <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                        {notifData!.unread > 9 ? "9+" : notifData!.unread}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 mt-1 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                      <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">
                          Notifications
                        </span>
                        {(notifData?.unread ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {!notifData?.items?.length ? (
                        <p className="px-3 py-6 text-sm text-gray-500 text-center">
                          No notifications yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100">
                          {notifData.items.map((n) => (
                            <li
                              key={n.id}
                              className={`px-3 py-2 text-sm ${
                                n.read_at == null ? "bg-blue-50/50" : ""
                              }`}
                            >
                              <p className="font-medium text-gray-900">{n.title}</p>
                              {n.body && (
                                <p className="text-gray-600 mt-0.5">{n.body}</p>
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
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-gray-100 transition"
                  >
                    <Avatar
                      text={appUser.fullName?.slice(0, 2).toUpperCase() ?? "?"}
                      size="sm"
                      imageUrl={appUser.photoURL}
                    />
                    <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {appUser.fullName}
                    </span>
                    <span className="text-gray-400 text-xs">▾</span>
                  </button>
                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        href={appUser.id != null ? `/profile/${appUser.id}` : "/"}
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Login with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AppNavbar() {
  return (
    <Suspense
      fallback={
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16" />
      }
    >
      <AppNavbarInner />
    </Suspense>
  );
}
