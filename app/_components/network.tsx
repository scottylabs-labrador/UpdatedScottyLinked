"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { Profile } from "@/lib/types";
import type { PendingSentItem, PendingReceivedItem } from "@/lib/db/connections";
import { HOME_PROFILES_PAGE_SIZE } from "@/lib/home/pagination";

interface NetworkProps {
  profiles: Profile[];
  loading: boolean;
  connectedIds: number[];
  currentUserId?: number | null;
  onConnectionCreated?: () => void;
  hasMoreProfiles?: boolean;
  loadingMoreProfiles?: boolean;
  onLoadMoreProfiles?: () => void | Promise<void>;
}

export default function Network({
  profiles,
  loading,
  connectedIds = [],
  currentUserId,
  onConnectionCreated,
  hasMoreProfiles = false,
  loadingMoreProfiles = false,
  onLoadMoreProfiles,
}: NetworkProps) {
  const uid = currentUserId ?? null;
  const discoverSentinelRef = useRef<HTMLDivElement>(null);
  const searchSentinelRef = useRef<HTMLDivElement>(null);
  const [connectingUsers, setConnectingUsers] = useState<Set<number>>(new Set());
  const [pendingSent, setPendingSent] = useState<PendingSentItem[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingReceivedItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterMajor, setFilterMajor] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchProfiles, setSearchProfiles] = useState<Profile[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const runSearch = useCallback(async () => {
    const q = debouncedQ.trim();
    const major = filterMajor.trim();
    const year = filterYear.trim();
    const skill = filterSkill.trim();
    if (!q && !major && !year && !skill) {
      setSearchProfiles(null);
      setSearchHasMore(false);
      return;
    }
    if (uid == null) {
      setSearchProfiles([]);
      setSearchHasMore(false);
      return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (major) params.set("major", major);
      if (year) params.set("year", year);
      if (skill) params.set("skill", skill);
      params.set("offset", "0");
      params.set("limit", String(HOME_PROFILES_PAGE_SIZE));
      const res = await fetch(`/api/users/search?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setSearchProfiles(data.profiles ?? []);
        setSearchHasMore(!!data.hasMore);
      } else {
        setSearchProfiles([]);
        setSearchHasMore(false);
      }
    } catch {
      setSearchProfiles([]);
      setSearchHasMore(false);
    } finally {
      setSearchLoading(false);
    }
  }, [debouncedQ, filterMajor, filterYear, filterSkill, uid]);

  const loadMoreSearch = useCallback(async () => {
    const q = debouncedQ.trim();
    const major = filterMajor.trim();
    const year = filterYear.trim();
    const skill = filterSkill.trim();
    if (!q && !major && !year && !skill) return;
    if (
      uid == null ||
      searchLoading ||
      searchLoadingMore ||
      !searchHasMore ||
      !searchProfiles
    ) {
      return;
    }
    setSearchLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (major) params.set("major", major);
      if (year) params.set("year", year);
      if (skill) params.set("skill", skill);
      params.set("offset", String(searchProfiles.length));
      params.set("limit", String(HOME_PROFILES_PAGE_SIZE));
      const res = await fetch(`/api/users/search?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return;
      const next = (data.profiles ?? []) as Profile[];
      setSearchProfiles((prev) => {
        if (!prev) return next;
        const seen = new Set(prev.map((p) => p.id));
        const merged = next.filter((p) => !seen.has(p.id));
        return [...prev, ...merged];
      });
      setSearchHasMore(!!data.hasMore);
    } finally {
      setSearchLoadingMore(false);
    }
  }, [
    debouncedQ,
    filterMajor,
    filterYear,
    filterSkill,
    uid,
    searchLoading,
    searchLoadingMore,
    searchHasMore,
    searchProfiles,
  ]);

  useEffect(() => {
    const el = discoverSentinelRef.current;
    if (!el || !hasMoreProfiles || loadingMoreProfiles || !onLoadMoreProfiles)
      return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void onLoadMoreProfiles();
      },
      { root: null, rootMargin: "280px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMoreProfiles, loadingMoreProfiles, onLoadMoreProfiles, profiles.length]);

  useEffect(() => {
    const el = searchSentinelRef.current;
    if (!el || !searchHasMore || searchLoadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreSearch();
      },
      { root: null, rootMargin: "280px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [searchHasMore, searchLoadingMore, loadMoreSearch, searchProfiles?.length]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const refreshPending = async () => {
    if (uid == null) {
      setPendingSent([]);
      setPendingReceived([]);
      setPendingLoading(false);
      return;
    }
    setPendingLoading(true);
    try {
      const res = await fetch("/api/connections/pending", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setPendingSent(data.sent ?? []);
        setPendingReceived(data.received ?? []);
      }
    } catch {
      setPendingSent([]);
      setPendingReceived([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    refreshPending();
  }, [uid]);

  const pendingSentIds = pendingSent.map((s) => s.receiverId);
  const pendingReceivedIds = pendingReceived.map((r) => r.requesterId);

  const connectedProfiles = profiles.filter((p) => connectedIds.includes(p.id));
  const notConnectedProfiles = profiles.filter(
    (p) =>
      !connectedIds.includes(p.id) &&
      !pendingSentIds.includes(p.id) &&
      !pendingReceivedIds.includes(p.id)
  );

  const handleConnect = async (targetUserId: number) => {
    if (uid == null || connectingUsers.has(targetUserId)) return;
    setConnectingUsers((prev) => new Set(prev).add(targetUserId));
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        onConnectionCreated?.();
        await refreshPending();
      }
    } catch (e) {
      console.error("Error creating connection:", e);
    } finally {
      setConnectingUsers((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  const handleCancel = async (connectionId: number) => {
    if (actioningId != null) return;
    setActioningId(connectionId);
    try {
      const res = await fetch(`/api/connections/${connectionId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await refreshPending();
        onConnectionCreated?.();
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleAccept = async (connectionId: number) => {
    if (actioningId != null) return;
    setActioningId(connectionId);
    try {
      const res = await fetch(`/api/connections/${connectionId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await refreshPending();
        onConnectionCreated?.();
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (connectionId: number) => {
    if (actioningId != null) return;
    setActioningId(connectionId);
    try {
      const res = await fetch(`/api/connections/${connectionId}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        await refreshPending();
        onConnectionCreated?.();
      }
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--muted)] text-sm">
        Loading network…
      </div>
    );
  }

  const searchActive =
    debouncedQ.trim() ||
    filterMajor.trim() ||
    filterYear.trim() ||
    filterSkill.trim();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6 card-surface p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="Search by name or Andrew ID..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-900 placeholder:text-gray-400"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Filter by major (optional)"
            value={filterMajor}
            onChange={(e) => setFilterMajor(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-900"
          />
          <input
            type="text"
            placeholder="Class year e.g. 2026 (optional)"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-900"
          />
          <input
            type="text"
            placeholder="Skill contains (optional)"
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-gray-900"
          />
        </div>
        {searchLoading && searchActive && (
          <p className="text-sm text-gray-500">Searching...</p>
        )}
      </div>

      {searchActive && searchProfiles && (
        <div className="mb-10">
          <h2 className="text-base font-semibold mb-3 text-gray-900">
            Search results
          </h2>
          {searchProfiles.length === 0 ? (
            <div className="card-surface p-8 text-center text-[var(--muted)] text-sm shadow-sm">
              No students match your search.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {searchProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="card-surface p-5 shadow-sm hover:border-gray-300/90 transition"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <Link href={`/profile/${profile.id}`} className="flex-shrink-0">
                      <Avatar
                        text={profile.avatar}
                        size="md"
                        imageUrl={profile.photoURL}
                      />
                    </Link>
                    <div className="flex-1">
                      <Link
                        href={`/profile/${profile.id}`}
                        className="text-lg font-bold text-gray-900 hover:text-[var(--brand)] hover:underline"
                      >
                        {profile.name}
                      </Link>
                      <p className="text-gray-600">{profile.major}</p>
                      <p className="text-sm text-gray-500">{profile.year}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                    {profile.bio}
                  </p>
                  {profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {profile.skills.slice(0, 8).map((s, i) => (
                        <span
                          key={`${profile.id}-${i}-${s}`}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {uid != null &&
                    profile.id !== uid &&
                    !connectedIds.includes(profile.id) &&
                    !pendingSentIds.includes(profile.id) &&
                    !pendingReceivedIds.includes(profile.id) && (
                      <button
                        type="button"
                        onClick={() => handleConnect(profile.id)}
                        disabled={connectingUsers.has(profile.id)}
                        className="w-full px-4 py-2.5 min-h-[40px] bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] text-sm font-semibold disabled:opacity-50"
                      >
                        {connectingUsers.has(profile.id)
                          ? "Connecting..."
                          : "Connect"}
                      </button>
                    )}
                </div>
              ))}
            </div>
          )}
          {searchActive && searchProfiles && searchProfiles.length > 0 && searchHasMore && (
            <div
              ref={searchSentinelRef}
              className="h-10 flex items-center justify-center text-xs text-[var(--muted)] mt-2"
              aria-hidden
            >
              {searchLoadingMore ? "Loading more…" : ""}
            </div>
          )}
        </div>
      )}

      {/* Connection requests */}
      {(pendingSent.length > 0 || pendingReceived.length > 0) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-black">
            Connection requests
          </h2>
          {pendingReceived.length > 0 && (
            <div className="card-surface shadow-sm p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Pending requests you received
              </h3>
              <ul className="space-y-3">
                {pendingReceived.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0"
                  >
                    <Link
                      href={`/profile/${r.requesterId}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar
                        text={r.requesterName.slice(0, 2).toUpperCase()}
                        size="sm"
                        imageUrl={r.requesterPhotoURL}
                      />
                      <span className="font-medium text-gray-900 truncate">
                        {r.requesterName}
                      </span>
                    </Link>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAccept(r.id)}
                        disabled={actioningId === r.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--brand)] rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(r.id)}
                        disabled={actioningId === r.id}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingSent.length > 0 && (
            <div className="card-surface shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Pending requests you sent
              </h3>
              <ul className="space-y-3">
                {pendingSent.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0"
                  >
                    <Link
                      href={`/profile/${s.receiverId}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar
                        text={s.receiverName.slice(0, 2).toUpperCase()}
                        size="sm"
                        imageUrl={s.receiverPhotoURL}
                      />
                      <span className="font-medium text-gray-900 truncate">
                        {s.receiverName}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCancel(s.id)}
                      disabled={actioningId === s.id}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel request
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Connected Users */}
      <h2 className="text-lg font-semibold mb-2 text-black">
        Your Connections
      </h2>
      {connectedProfiles.length === 0 ? (
        <div className="card-surface shadow-sm p-6 text-center text-gray-500 mb-6">
          No connections yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {connectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="card-surface shadow-sm p-6 hover:border-gray-300/90 transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <Link href={`/profile/${profile.id}`} className="flex-shrink-0">
                  <Avatar
                    text={profile.avatar}
                    size="md"
                    imageUrl={profile.photoURL}
                  />
                </Link>
                <div className="flex-1">
                  <Link
                    href={`/profile/${profile.id}`}
                    className="text-lg font-bold text-gray-900 hover:text-[var(--brand)] hover:underline"
                  >
                    {profile.name}
                  </Link>
                  <p className="text-gray-600">{profile.major}</p>
                  <p className="text-sm text-gray-500">{profile.year}</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-4">{profile.bio}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills
                  .slice(0, 3)
                  .map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600 ">
                  {profile.connections} connections
                </span>
                {/* No connect button for already connected */}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* New People Section */}
      <h2 className="text-lg font-semibold mb-2 text-black">
        Discover New People
      </h2>
      {notConnectedProfiles.length === 0 ? (
        <div className="card-surface shadow-sm p-6 text-center text-gray-500">
          No new people to discover right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {notConnectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="card-surface shadow-sm p-6 hover:border-gray-300/90 transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <Link href={`/profile/${profile.id}`} className="flex-shrink-0">
                  <Avatar
                    text={profile.avatar}
                    size="md"
                    imageUrl={profile.photoURL}
                  />
                </Link>
                <div className="flex-1">
                  <Link
                    href={`/profile/${profile.id}`}
                    className="text-lg font-bold text-gray-900 hover:text-[var(--brand)] hover:underline"
                  >
                    {profile.name}
                  </Link>
                  <p className="text-gray-600">{profile.major}</p>
                  <p className="text-sm text-gray-500">{profile.year}</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-4">{profile.bio}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills
                  .slice(0, 3)
                  .map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {profile.connections} connections
                </span>
                <button
                  onClick={() => handleConnect(profile.id)}
                  disabled={connectingUsers.has(profile.id)}
                  className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingUsers.has(profile.id)
                    ? "Connecting..."
                    : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMoreProfiles && (
        <div
          ref={discoverSentinelRef}
          className="h-10 flex items-center justify-center text-xs text-[var(--muted)] mt-2"
          aria-hidden
        >
          {loadingMoreProfiles ? "Loading more people…" : ""}
        </div>
      )}
    </div>
  );
}
