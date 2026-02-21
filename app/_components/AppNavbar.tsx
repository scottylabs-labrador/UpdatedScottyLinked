"use client";

import React, { useState, useEffect, useRef } from "react";
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
}

export default function AppNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const tab = pathname === "/" ? searchParams.get("tab") : null;
  const activeTab = tab === "opportunities" || tab === "network" || tab === "profile" ? tab : "feed";
  const onProfilePage = pathname.startsWith("/profile/");

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.appUser) setAppUser(data.appUser);
        else setAppUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
      <div className="max-w-7xl mx-auto px-6">
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
            <nav className="flex gap-1">
              {navLink("Feed", "/", !onProfilePage && activeTab === "feed")}
              {navLink("Opportunities", "/?tab=opportunities", !onProfilePage && activeTab === "opportunities")}
              {navLink("Network", "/?tab=network", !onProfilePage && activeTab === "network")}
              {navLink("Profile", "/?tab=profile", (!onProfilePage && activeTab === "profile") || onProfilePage)}
            </nav>
            <div className="flex items-center gap-2" ref={profileMenuRef}>
              {authLoading ? (
                <span className="text-sm text-gray-500">Loading...</span>
              ) : appUser ? (
                <div className="relative">
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
