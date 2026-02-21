"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Feed from "./_components/feed";
import Opportunities from "./_components/opportunities";
import Network from "./_components/network";
import ProfileView from "./_components/profileview";
import AppNavbar from "./_components/AppNavbar";
import { FeedPost, Opportunity, Profile, UserProfile } from "@/lib/types";
import {
  fetchPosts,
  fetchOpportunities,
  fetchProfiles,
  fetchCurrentUser,
} from "@/lib/api";
import { getConnectedUserIds } from "@/lib/db/connections";
import { createClient } from "@/lib/supabase/client";

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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: "feed" | "opportunities" | "network" | "profile" =
    tabParam === "opportunities" || tabParam === "network" || tabParam === "profile"
      ? tabParam
      : "feed";

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
      <AppNavbar />

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
            currentUserId={currentUserId}
            onConnectionCreated={loadData}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView
            user={userProfile}
            loading={loading}
            onProfileUpdated={() => {
              loadMe();
              loadData();
            }}
          />
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

function PageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}

export default function Page() {
  return (
    <React.Suspense fallback={<PageFallback />}>
      <LandingPage />
    </React.Suspense>
  );
}
