"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { Profile } from "@/lib/types";
import type { PendingSentItem, PendingReceivedItem } from "@/lib/db/connections";

interface NetworkProps {
  profiles: Profile[];
  loading: boolean;
  connectedIds: number[];
  currentUserId?: number | null;
  onConnectionCreated?: () => void;
}

export default function Network({
  profiles,
  loading,
  connectedIds = [],
  currentUserId,
  onConnectionCreated,
}: NetworkProps) {
  const uid = currentUserId ?? null;
  const [connectingUsers, setConnectingUsers] = useState<Set<number>>(new Set());
  const [pendingSent, setPendingSent] = useState<PendingSentItem[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingReceivedItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

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
    return <div className="text-center py-8">Loading profiles...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search students by name, major, or skills..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
      </div>

      {/* Connection requests */}
      {(pendingSent.length > 0 || pendingReceived.length > 0) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2 text-black">
            Connection requests
          </h2>
          {pendingReceived.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
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
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            <div className="bg-white rounded-lg shadow p-4">
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
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 mb-6">
          No connections yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {connectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
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
                    className="text-lg font-bold text-gray-900 hover:text-blue-600 hover:underline"
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
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No new people to discover right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {notConnectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
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
                    className="text-lg font-bold text-gray-900 hover:text-blue-600 hover:underline"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
