"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import logo from "./147268137.png";
import Feed from "./_components/feed";
import Opportunities from "./_components/opportunities";
import Network from "./_components/network";
import ProfileView from "./_components/profileview";
import { FeedPost, Opportunity, Profile, UserProfile } from "@/lib/types";
import {
  fetchPosts,
  fetchOpportunities,
  fetchProfiles,
  fetchCurrentUser,
} from "@/lib/api";
import { getConnectedUserIds } from "@/lib/db/connections";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle, signOut } from "@/app/auth/login/actions";

interface AppUser {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
}

interface LandingPageProps {
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  const [activeTab, setActiveTab] = useState<
    "feed" | "opportunities" | "network" | "profile"
  >("feed");

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState<number[]>([]);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentUserId = appUser?.id ?? null;

  const loadMe = async () => {
    const res = await fetch("/api/me", { credentials: "include" });
    const data = await res.json();
    if (data.appUser) setAppUser(data.appUser);
    else setAppUser(null);
  };

  const loadData = async () => {
    setLoading(true);
    const uid = currentUserId ?? null;
    try {
      const [postsData, opportunitiesData, profilesData, userData, connected] =
        await Promise.all([
          fetchPosts(uid),
          fetchOpportunities(),
          fetchProfiles(uid ?? 0),
          fetchCurrentUser(uid ?? undefined),
          getConnectedUserIds(uid, true),
        ]);
      setPosts(postsData);
      setOpportunities(opportunitiesData);
      setProfiles(profilesData);
      setUserProfile(userData);
      setConnectedIds(connected);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe().finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadMe();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const NavButton = ({
    label,
    tab,
  }: {
    label: string;
    tab: "feed" | "opportunities" | "network" | "profile";
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-semibold transition-all text-sm ${
        activeTab === tab
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const message = params.get("message");
    if (error === "invalid_domain") {
      setAuthError("Please sign in with your @andrew.cmu.edu email.");
    } else if (error === "auth_failed") {
      setAuthError("Sign-in failed. Please try again.");
    } else if (error === "code_exchange_failed") {
      setAuthError(
        message
          ? `Sign-in failed: ${message}`
          : "Sign-in failed (code exchange). Check that NEXT_PUBLIC_APP_URL matches your Supabase redirect URL."
      );
    }
  }, []);

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result.url) window.location.href = result.url;
    else if (result.error) setAuthError(result.error);
  };

  const handleSignOut = async () => {
    await signOut();
    setAppUser(null);
    loadData();
  };

  return (
    <>
      {authError && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <span>{authError}</span>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="underline"
          >
            Dismiss
          </button>
        </div>
      )}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src={logo}
                alt="ScottyLinked Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
              <span className="text-xl font-bold text-gray-900">
                ScottyLinked
              </span>
            </div>

            <div className="flex items-center gap-4">
              <nav className="flex gap-1">
                <NavButton label="Feed" tab="feed" />
                <NavButton label="Opportunities" tab="opportunities" />
                <NavButton label="Network" tab="network" />
                <NavButton label="Profile" tab="profile" />
              </nav>
              <div className="flex items-center gap-2">
                {authLoading ? (
                  <span className="text-sm text-gray-500">Loading...</span>
                ) : appUser ? (
                  <>
                    <div className="flex items-center gap-2">
                      {appUser.photoURL ? (
                        <Image
                          src={appUser.photoURL}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                          {appUser.fullName?.slice(0, 2).toUpperCase() ?? "?"}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {appUser.fullName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Sign out
                    </button>
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

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-6 p-6">
        {/* Tab Content */}
        {activeTab === "feed" && (
          <Feed
            posts={posts}
            loading={loading}
            onPostCreated={loadData}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "opportunities" && (
          <Opportunities opportunities={opportunities} loading={loading} />
        )}
        {activeTab === "network" && (
          <Network
            profiles={profiles}
            loading={loading}
            connectedIds={connectedIds}
            onConnectionCreated={loadData}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView user={userProfile} loading={loading} />
        )}
      </div>
      <footer className="py-4 text-center">
        <a
          href="/api/auth/debug"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Auth debug
        </a>
      </footer>
    </>
  );
};

export default LandingPage;
