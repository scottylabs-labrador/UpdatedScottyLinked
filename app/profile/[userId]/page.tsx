"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReportModal from "@/app/_components/ReportModal";
import { AppPageContainer } from "@/app/_components/AppShell";
import ProfileHeader from "@/app/_components/ProfileHeader";
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
      <AppPageContainer>
        <p className="text-center py-16 text-[var(--muted)] text-sm">
          Loading profile…
        </p>
      </AppPageContainer>
    );
  }

  if (error || !user) {
    return (
      <AppPageContainer>
        <div className="card-surface p-8 text-center shadow-sm space-y-3">
          <p className="text-[var(--foreground)]">{error ?? "User not found"}</p>
          <Link
            href="/"
            className="text-[var(--brand)] font-medium hover:underline"
          >
            Back to home
          </Link>
        </div>
      </AppPageContainer>
    );
  }

  const isOwn = currentUserId != null && currentUserId === profileId;

  const connectionSlot =
    !isOwn && connectionState ? (
      <div className="flex flex-wrap gap-2">
        {connectionState.status === "none" && (
          <button
            type="button"
            onClick={sendRequest}
            disabled={connectionBusy}
            className="px-4 py-2 min-h-[40px] bg-[var(--brand)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            {connectionBusy ? "Connecting..." : "Connect"}
          </button>
        )}
        {connectionState.status === "pending_sent" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--muted)]">Pending request</span>
            <button
              type="button"
              onClick={cancelRequest}
              disabled={connectionBusy}
              className="px-4 py-2 text-[var(--foreground)] bg-[var(--chip-bg)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
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
              className="px-4 py-2 min-h-[40px] bg-[var(--brand)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={rejectRequest}
              disabled={connectionBusy}
              className="px-4 py-2 text-[var(--foreground)] bg-[var(--chip-bg)] text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
        {connectionState.status === "connected" && (
          <span className="text-sm text-[var(--muted)] font-medium">Connected</span>
        )}
      </div>
    ) : null;

  const otherActions =
    !isOwn && currentUserId != null ? (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startMessage}
          disabled={actionBusy}
          className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--hit-hover)] min-h-[40px]"
        >
          Message
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="px-3 py-1.5 text-sm text-red-700 border border-red-200 rounded-lg hover:bg-red-50 min-h-[40px]"
        >
          Report
        </button>
        <button
          type="button"
          onClick={blockUser}
          disabled={actionBusy}
          className="px-3 py-1.5 text-sm text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:bg-[var(--hit-hover)] min-h-[40px]"
        >
          Block
        </button>
      </div>
    ) : null;

  return (
    <>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={profileId}
      />
      <AppPageContainer>
        <div className="space-y-6">
          <ProfileHeader
            user={user}
            actionSlot={
              <div className="flex flex-col items-stretch sm:items-end gap-2">
                {isOwn && (
                  <Link
                    href="/?tab=profile&edit=1"
                    className="px-4 py-2 min-h-[40px] border-2 border-[var(--brand)] text-[var(--brand)] rounded-lg hover:bg-blue-50/80 transition font-semibold text-sm text-center"
                  >
                    Edit profile
                  </Link>
                )}
                {connectionSlot}
                {otherActions}
              </div>
            }
          />

          <div className="card-surface p-5 sm:p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-2">
                Contact
              </h3>
              <p className="text-[var(--foreground)]">{user.email}</p>
            </div>

            {user.bio?.trim() ? (
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-2">
                  About
                </h3>
                <p className="text-[var(--foreground)] whitespace-pre-wrap">{user.bio}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No bio yet.</p>
            )}

            {(user.campusRoles?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-2">
                  Campus roles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.campusRoles.map((r, idx) => (
                    <span
                      key={idx}
                      className="chip-tag"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(user.organizations?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-2">
                  Organizations
                </h3>
                <ul className="space-y-2">
                  {user.organizations.map((o, idx) => (
                    <li key={idx} className="text-[var(--foreground)]">
                      <span className="font-medium">{o.name}</span>
                      {o.role ? (
                        <span className="text-[var(--muted)]"> — {o.role}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user.skills && user.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-3">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="chip-tag font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppPageContainer>
    </>
  );
}
