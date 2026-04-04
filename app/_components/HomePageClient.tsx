"use client";

/** Home tabs: client `?tab=` via HomeTabNavProvider; data from RSC bootstrap + `/api/home` on auth/mutations. */

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
} from "react";
import Feed from "./feed";
import GroupsBrowse from "./groups";
import Network from "./network";
import ProfileView from "./profileview";
import AppShell from "./AppShell";
import HomeRail from "./HomeRail";
import { useHomeTab } from "./HomeTabNav";
import type { FeedPost, GroupListItem, Profile, UserProfile } from "@/lib/types";
import type { HomeBootstrap } from "@/lib/home/bootstrap";
import { createClient } from "@/lib/supabase/client";

interface AppUser {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  isModerator?: boolean;
}

function bootstrapToState(b: HomeBootstrap) {
  return {
    posts: b.posts,
    groups: b.groups,
    profiles: b.profiles,
    userProfile: b.profile,
    connectedIds: b.connectedIds,
    myGroups: b.myGroups,
    appUser: b.appUser
      ? ({
          id: b.appUser.id,
          handle: b.appUser.handle,
          fullName: b.appUser.fullName,
          photoURL: b.appUser.photoURL,
          isModerator: b.appUser.isModerator,
        } satisfies AppUser)
      : null,
  };
}

export default function HomePageClient({
  initial,
}: {
  initial: HomeBootstrap;
}) {
  const { activeHomeTab: activeTab } = useHomeTab();

  const seeded = bootstrapToState(initial);
  const [posts, setPosts] = useState<FeedPost[]>(seeded.posts);
  const [groups, setGroups] = useState<GroupListItem[]>(seeded.groups);
  const [profiles, setProfiles] = useState<Profile[]>(seeded.profiles);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    seeded.userProfile
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectedIds, setConnectedIds] = useState<number[]>(seeded.connectedIds);
  const [myGroups, setMyGroups] = useState<{ id: number; name: string }[]>(
    seeded.myGroups
  );
  const [appUser, setAppUser] = useState<AppUser | null>(seeded.appUser);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentUserId = appUser?.id ?? null;

  const profileIncomplete =
    !!userProfile &&
    (!userProfile.bio?.trim() ||
      !userProfile.major?.trim() ||
      userProfile.major === "Undeclared");

  const refreshHome = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/home", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as HomeBootstrap;
      const s = bootstrapToState(data);
      startTransition(() => {
        setPosts(s.posts);
        setGroups(s.groups);
        setProfiles(s.profiles);
        setUserProfile(s.userProfile);
        setConnectedIds(s.connectedIds);
        setMyGroups(s.myGroups);
        setAppUser(s.appUser);
      });
    } catch (e) {
      console.error("refreshHome:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshHome();
    });
    return () => subscription.unsubscribe();
  }, [refreshHome]);

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
          : "Sign-in failed (code exchange). Set NEXT_PUBLIC_APP_URL on Vercel (or rely on VERCEL_URL) and add the matching /auth/callback URL in Supabase."
      );
    }
  }, []);

  const onProfileUpdated = useCallback(async () => {
    await refreshHome();
  }, [refreshHome]);

  const panelWrap = (tab: typeof activeTab, node: React.ReactNode) => (
    <div
      className={activeTab !== tab ? "hidden" : undefined}
      aria-hidden={activeTab !== tab}
    >
      {node}
    </div>
  );

  return (
    <>
      {isRefreshing && (
        <div
          className="fixed top-14 left-0 right-0 z-[45] h-0.5 bg-[var(--brand)]/50 motion-safe:animate-pulse pointer-events-none"
          aria-hidden
        />
      )}

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

      <AppShell
        aside={
          appUser ? (
            <HomeRail
              user={appUser}
              profileIncomplete={profileIncomplete}
              isModerator={appUser.isModerator}
            />
          ) : undefined
        }
      >
        {panelWrap(
          "feed",
          <Feed
            posts={posts}
            loading={false}
            onPostCreated={refreshHome}
            currentUserId={currentUserId}
            myGroups={myGroups}
          />
        )}
        {panelWrap(
          "groups",
          <GroupsBrowse
            groups={groups}
            loading={false}
            currentUserId={currentUserId}
            onGroupCreated={refreshHome}
          />
        )}
        {panelWrap(
          "network",
          <Network
            profiles={profiles}
            loading={false}
            connectedIds={connectedIds}
            currentUserId={currentUserId}
            onConnectionCreated={refreshHome}
          />
        )}
        {panelWrap(
          "profile",
          <ProfileView
            user={userProfile}
            loading={false}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </AppShell>

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
}
