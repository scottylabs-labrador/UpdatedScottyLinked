"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/app/_components/Avatar";
import AppNavbar from "@/app/_components/AppNavbar";
import ReportModal from "@/app/_components/ReportModal";
import { UserProfile } from "@/lib/types";

type ConnectionStatus =
  | { status: "none" }
  | { status: "connected" }
  | { status: "pending_sent"; connectionId: number }
  | { status: "pending_received"; connectionId: number };

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const profileId = parseInt(userId, 10);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionStatus | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "User not found" : "Failed to load");
        return res.json();
      })
      .then(setUser)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setCurrentUserId(data.appUser?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (currentUserId == null || isNaN(profileId) || currentUserId === profileId) {
      setConnectionState(null);
      return;
    }
    fetch(`/api/connections/status?userId=${profileId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.status) setConnectionState(data as ConnectionStatus);
        else setConnectionState({ status: "none" });
      })
      .catch(() => setConnectionState({ status: "none" }));
  }, [currentUserId, profileId]);

  const sendRequest = async () => {
    if (connectionBusy || currentUserId == null) return;
    setConnectionBusy(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: profileId }),
      });
      if (res.ok) {
        const data = await fetch(`/api/connections/status?userId=${profileId}`, {
          credentials: "include",
        }).then((r) => r.json());
        setConnectionState(data.status ? data : { status: "none" });
      }
    } finally {
      setConnectionBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (connectionState?.status !== "pending_sent" || connectionState.connectionId == null || connectionBusy) return;
    setConnectionBusy(true);
    try {
      const res = await fetch(`/api/connections/${connectionState.connectionId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setConnectionState({ status: "none" });
    } finally {
      setConnectionBusy(false);
    }
  };

  const acceptRequest = async () => {
    if (connectionState?.status !== "pending_received" || connectionState.connectionId == null || connectionBusy) return;
    setConnectionBusy(true);
    try {
      const res = await fetch(`/api/connections/${connectionState.connectionId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setConnectionState({ status: "connected" });
    } finally {
      setConnectionBusy(false);
    }
  };

  const startMessage = async () => {
    if (currentUserId == null || currentUserId === profileId || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otherUserId: profileId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const blockUser = async () => {
    if (currentUserId == null || currentUserId === profileId || actionBusy) return;
    if (!confirm("Block this user? You will not see each other's content.")) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ blockedUserId: profileId }),
      });
      if (res.ok) router.push("/");
    } finally {
      setActionBusy(false);
    }
  };

  const rejectRequest = async () => {
    if (connectionState?.status !== "pending_received" || connectionState.connectionId == null || connectionBusy) return;
    setConnectionBusy(true);
    try {
      const res = await fetch(`/api/connections/${connectionState.connectionId}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) setConnectionState({ status: "none" });
    } finally {
      setConnectionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error ?? "User not found"}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={profileId}
      />
      <AppNavbar />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-6">
              <Avatar
                text={user.avatar}
                size="lg"
                imageUrl={user.photoURL}
              />
              <div className="flex-1 pt-14 flex flex-wrap items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <p className="text-gray-600">
                    {user.major} • {user.year}
                  </p>
                </div>
                {connectionState && (
                  <div className="flex gap-2 ml-auto">
                    {connectionState.status === "none" && (
                      <button
                        type="button"
                        onClick={sendRequest}
                        disabled={connectionBusy}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {connectionBusy ? "Connecting..." : "Connect"}
                      </button>
                    )}
                    {connectionState.status === "pending_sent" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Pending request</span>
                        <button
                          type="button"
                          onClick={cancelRequest}
                          disabled={connectionBusy}
                          className="px-4 py-2 text-gray-700 bg-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Cancel request
                        </button>
                      </div>
                    )}
                    {connectionState.status === "pending_received" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={acceptRequest}
                          disabled={connectionBusy}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={rejectRequest}
                          disabled={connectionBusy}
                          className="px-4 py-2 text-gray-700 bg-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {connectionState.status === "connected" && (
                      <span className="text-sm text-gray-500 font-medium">Connected</span>
                    )}
                  </div>
                )}
                {currentUserId != null && currentUserId !== profileId && (
                  <div className="w-full flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={startMessage}
                      disabled={actionBusy}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="px-3 py-1.5 text-sm text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      onClick={blockUser}
                      disabled={actionBusy}
                      className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Block
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Contact
                </h3>
                <p className="text-gray-800">{user.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  About
                </h3>
                <p className="text-gray-800">{user.bio || "No bio yet."}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Academic Info
                </h3>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Year</p>
                    <p className="font-semibold text-gray-900">{user.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Connections</p>
                    <p className="font-semibold text-gray-900">{user.connections}</p>
                  </div>
                </div>
              </div>
              {user.skills && user.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
