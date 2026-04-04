"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import { AppPageContainer } from "@/app/_components/AppShell";
import { createPost } from "@/lib/api/client";
import type {
  CommunityGroup,
  FeedPost,
  GroupMembershipRole,
  Opportunity,
} from "@/lib/types";

type Tab = "discussion" | "opportunities" | "members" | "requests";

type MemberRow = {
  userId: number;
  fullName: string;
  photoURL: string | null;
  role: GroupMembershipRole;
  joinedAt: string;
};

type PendingReq = {
  id: number;
  applicantId: number;
  applicantName: string;
  applicantPhotoURL: string | null;
  message: string | null;
  created_at: string;
};

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string, 10);

  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [myRole, setMyRole] = useState<GroupMembershipRole | null>(null);
  const [joinRequest, setJoinRequest] = useState<{
    status: string;
    id?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("discussion");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [requests, setRequests] = useState<PendingReq[]>([]);

  const [postContent, setPostContent] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [oppTitle, setOppTitle] = useState("");
  const [oppDesc, setOppDesc] = useState("");
  const [oppSkills, setOppSkills] = useState("");
  const [oppType, setOppType] = useState("Project");
  const [oppSubmitting, setOppSubmitting] = useState(false);
  const [oppError, setOppError] = useState<string | null>(null);

  const isMember = myRole != null;
  const isMod = myRole === "owner" || myRole === "moderator";
  const isOwner = myRole === "owner";

  const loadMeta = useCallback(async () => {
    if (isNaN(groupId)) return;
    const res = await fetch(`/api/groups/${groupId}`, { credentials: "include" });
    if (!res.ok) {
      setError(res.status === 404 ? "Group not found" : "Failed to load");
      setGroup(null);
      return;
    }
    const data = await res.json();
    setGroup(data.group);
    setMemberCount(data.memberCount ?? 0);
    setMyRole(data.myRole ?? null);
    setJoinRequest(data.joinRequest ?? null);
    setError(null);
  }, [groupId]);

  const loadPosts = useCallback(async () => {
    if (isNaN(groupId) || !isMember) {
      setPosts([]);
      return;
    }
    const res = await fetch(`/api/groups/${groupId}/posts`, {
      credentials: "include",
    });
    if (!res.ok) {
      setPosts([]);
      return;
    }
    const data = await res.json();
    setPosts(data.posts ?? []);
  }, [groupId, isMember]);

  const loadOpportunities = useCallback(async () => {
    if (isNaN(groupId) || !isMember) {
      setOpportunities([]);
      return;
    }
    const res = await fetch(`/api/groups/${groupId}/opportunities`, {
      credentials: "include",
    });
    if (!res.ok) {
      setOpportunities([]);
      return;
    }
    const data = await res.json();
    setOpportunities(data.opportunities ?? []);
  }, [groupId, isMember]);

  const loadMembers = useCallback(async () => {
    if (isNaN(groupId) || !isMember) {
      setMembers([]);
      return;
    }
    const res = await fetch(`/api/groups/${groupId}/members`, {
      credentials: "include",
    });
    if (!res.ok) {
      setMembers([]);
      return;
    }
    const data = await res.json();
    setMembers(data.members ?? []);
  }, [groupId, isMember]);

  const loadRequests = useCallback(async () => {
    if (isNaN(groupId) || !isMod) {
      setRequests([]);
      return;
    }
    const res = await fetch(`/api/groups/${groupId}/requests`, {
      credentials: "include",
    });
    if (!res.ok) {
      setRequests([]);
      return;
    }
    const data = await res.json();
    setRequests(data.requests ?? []);
  }, [groupId, isMod]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.appUser?.id ?? null));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadMeta().finally(() => setLoading(false));
  }, [loadMeta]);

  useEffect(() => {
    if (tab === "discussion") loadPosts();
    if (tab === "opportunities") loadOpportunities();
    if (tab === "members") loadMembers();
    if (tab === "requests") loadRequests();
  }, [tab, loadPosts, loadOpportunities, loadMembers, loadRequests, myRole]);

  const submitApply = async () => {
    setApplySubmitting(true);
    setApplyError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: applyMessage.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setApplyOpen(false);
      setApplyMessage("");
      loadMeta();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Failed");
    } finally {
      setApplySubmitting(false);
    }
  };

  const withdrawApply = async () => {
    await fetch(`/api/groups/${groupId}/requests`, {
      method: "DELETE",
      credentials: "include",
    });
    loadMeta();
  };

  const reviewRequest = async (requestId: number, action: "accept" | "reject") => {
    const res = await fetch(
      `/api/groups/${groupId}/requests/${requestId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      }
    );
    if (res.ok) {
      loadRequests();
      loadMeta();
      loadMembers();
    }
  };

  const setModerator = async (userId: number, moderator: boolean) => {
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ moderator }),
    });
    if (res.ok) loadMembers();
  };

  const submitGroupPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPostSubmitting(true);
    try {
      const ok = await createPost({
        title: "",
        content: postContent.trim(),
        tags: [],
        visibility: [{ scope: "group", groupId }],
      });
      if (ok) {
        setPostContent("");
        loadPosts();
      }
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (
      !confirm(
        "Leave this group? You may need to request to join again if the group is approval-only."
      )
    ) {
      return;
    }
    setLeaveBusy(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Could not leave");
        return;
      }
      window.location.href = "/?tab=groups";
    } finally {
      setLeaveBusy(false);
    }
  };

  const submitOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim() || !oppDesc.trim()) {
      setOppError("Title and description required");
      return;
    }
    setOppSubmitting(true);
    setOppError(null);
    try {
      const skills = oppSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: oppTitle.trim(),
          description: oppDesc.trim(),
          skills,
          type: oppType,
          groupId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOppTitle("");
      setOppDesc("");
      setOppSkills("");
      loadOpportunities();
    } catch (err) {
      setOppError(err instanceof Error ? err.message : "Failed");
    } finally {
      setOppSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppPageContainer>
        <p className="text-center py-12 text-[var(--muted)] text-sm">Loading…</p>
      </AppPageContainer>
    );
  }

  if (error || !group) {
    return (
      <AppPageContainer maxWidthClass="max-w-2xl">
          <div className="text-center py-12">
            <p className="text-[var(--foreground)]">{error ?? "Not found"}</p>
            <Link
              href="/?tab=groups"
              className="mt-4 inline-block text-[var(--brand)] hover:underline text-sm font-medium"
            >
              Back to groups
            </Link>
          </div>
      </AppPageContainer>
    );
  }

  const pendingJoin = joinRequest?.status === "pending";

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      key={id}
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
        tab === id
          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]"
          : "text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <AppPageContainer maxWidthClass="max-w-3xl">
        <Link
          href="/?tab=groups"
          className="text-sm text-[var(--brand)] hover:underline mb-4 inline-block font-medium"
        >
          ← Groups
        </Link>

        <header className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-gradient-to-br from-[var(--brand)]/[0.07] via-[var(--surface)] to-[var(--page)]/90 shadow-sm mb-6">
          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] tracking-tight">
                  {group.name}
                </h1>
                {group.description ? (
                  <p className="text-[var(--muted)] mt-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-w-2xl">
                    {group.description}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--muted)] mt-2 italic">
                    No description yet.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[var(--chip-bg)]/95 px-3 py-1 text-xs font-semibold text-[var(--chip-text)] ring-1 ring-[var(--border)]">
                    {memberCount} member{memberCount !== 1 ? "s" : ""}
                  </span>
                  {myRole && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
                        myRole === "owner"
                          ? "bg-amber-50 text-amber-900 ring-amber-200/80"
                          : myRole === "moderator"
                            ? "bg-violet-50 text-violet-900 ring-violet-200/80"
                            : "bg-[var(--chip-bg)] text-[var(--chip-text)] ring-[var(--border)]"
                      }`}
                    >
                      {myRole === "owner" ? "Owner" : myRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {currentUserId == null && (
                <p className="text-sm text-[var(--muted)]">Sign in to join this group.</p>
              )}
              {currentUserId != null && !isMember && !pendingJoin && (
                <button
                  type="button"
                  onClick={() => {
                    setApplyOpen(true);
                    setApplyError(null);
                  }}
                  className="px-5 py-2.5 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-hover)] font-semibold text-sm min-h-[44px] shadow-sm"
                >
                  Request to join
                </button>
              )}
              {currentUserId != null && pendingJoin && !isMember && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl font-medium">
                    Request pending
                  </span>
                  <button
                    type="button"
                    onClick={withdrawApply}
                    className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline-offset-2 hover:underline px-2"
                  >
                    Withdraw
                  </button>
                </div>
              )}
              {isMember && !isOwner && (
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={leaveBusy}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-700 bg-red-50/80 hover:bg-red-100/80 disabled:opacity-50 min-h-[44px]"
                >
                  {leaveBusy ? "Leaving…" : "Leave group"}
                </button>
              )}
            </div>
          </div>
        </header>

        {isMember && (
          <div
            className="mb-6 inline-flex flex-wrap gap-1 rounded-full bg-[var(--pill-inactive-hover)] p-1 ring-1 ring-[var(--border)]"
            role="tablist"
            aria-label="Group sections"
          >
            {tabBtn("discussion", "Discussion")}
            {tabBtn("opportunities", "Opportunities")}
            {tabBtn("members", "Members")}
            {isMod && tabBtn("requests", "Requests")}
          </div>
        )}

        {isMember && tab === "discussion" && (
          <div className="space-y-6">
            <section className="card-surface p-5 shadow-sm ring-1 ring-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                Start a discussion
              </h2>
              <p className="text-xs text-[var(--muted)] mb-3">
                Visible to members of this group. Use the home feed composer to reach multiple audiences at once.
              </p>
              <form onSubmit={submitGroupPost} className="space-y-3">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl input-surface resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25"
                  placeholder="Share an update with the group…"
                />
                <button
                  type="submit"
                  disabled={postSubmitting || !postContent.trim()}
                  className="px-5 py-2.5 bg-[var(--brand)] text-white rounded-xl text-sm font-semibold disabled:opacity-50 min-h-[44px]"
                >
                  {postSubmitting ? "Posting…" : "Post to group"}
                </button>
              </form>
            </section>

            <ul className="space-y-3">
              {posts.length === 0 ? (
                <li className="card-surface p-10 text-center text-sm text-[var(--muted)] shadow-sm">
                  No posts yet. Start the conversation.
                </li>
              ) : (
                posts.map((p) => (
                  <li
                    key={p.id}
                    className="card-surface p-4 sm:p-5 shadow-sm ring-1 ring-[var(--border)] hover:border-[var(--border)]/80 transition-colors"
                  >
                    <div className="flex gap-3">
                      <Link href={`/profile/${p.authorId}`} className="shrink-0">
                        <Avatar
                          text={p.avatar}
                          size="md"
                          imageUrl={p.authorPhotoURL}
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <Link
                            href={`/profile/${p.authorId}`}
                            className="font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                          >
                            {p.author}
                          </Link>
                          <span className="text-xs text-[var(--muted)]">
                            {p.timestamp}
                          </span>
                        </div>
                        {p.title && p.title !== p.content?.slice(0, 50) && (
                          <p className="font-medium text-[var(--foreground)] mt-1">{p.title}</p>
                        )}
                        <p className="text-[var(--foreground)] text-sm mt-1 whitespace-pre-wrap">
                          {p.content}
                        </p>
                        <Link
                          href={`/post/${p.id}`}
                          className="text-xs text-[var(--brand)] font-medium mt-2 inline-block hover:underline"
                        >
                          Open thread · {p.comments} comments
                        </Link>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {isMember && tab === "opportunities" && (
          <div className="space-y-6">
            {isMod && (
              <form
                onSubmit={submitOpportunity}
                className="card-surface p-4 sm:p-5 shadow-sm space-y-3"
              >
                <h3 className="font-semibold text-[var(--foreground)]">New listing (moderators)</h3>
                <input
                  type="text"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface"
                />
                <textarea
                  value={oppDesc}
                  onChange={(e) => setOppDesc(e.target.value)}
                  rows={3}
                  placeholder="Description"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface resize-none"
                />
                <input
                  type="text"
                  value={oppSkills}
                  onChange={(e) => setOppSkills(e.target.value)}
                  placeholder="Skills (comma-separated)"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface"
                />
                <select
                  value={oppType}
                  onChange={(e) => setOppType(e.target.value)}
                  className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface"
                >
                  <option value="Project">Project</option>
                  <option value="Internship">Internship</option>
                  <option value="Research">Research</option>
                  <option value="Job">Job</option>
                </select>
                {oppError && (
                  <p className="text-sm text-red-600">{oppError}</p>
                )}
                <button
                  type="submit"
                  disabled={oppSubmitting}
                  className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {oppSubmitting ? "Posting…" : "Post listing"}
                </button>
              </form>
            )}

            <ul className="space-y-3">
              {opportunities.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-8">
                  No listings yet.
                </p>
              ) : (
                opportunities.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/projects/${o.id}`}
                      className="block card-surface p-4 shadow-sm hover:border-[var(--brand)]/30 transition-colors"
                    >
                      <div className="flex justify-between gap-2">
                        <h3 className="font-semibold text-[var(--foreground)]">{o.title}</h3>
                        <span className="text-xs font-semibold uppercase text-[var(--muted)] shrink-0">
                          {o.type}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                        {o.description}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-2">{o.posted}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {isMember && tab === "members" && (
          <ul className="divide-y divide-[var(--border)] card-surface shadow-sm rounded-[var(--radius-card)] overflow-hidden">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Link href={`/profile/${m.userId}`} className="shrink-0">
                  <Avatar
                    text={m.fullName.slice(0, 2).toUpperCase()}
                    size="md"
                    imageUrl={m.photoURL}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${m.userId}`}
                    className="font-medium text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    {m.fullName}
                  </Link>
                  <p className="text-xs text-[var(--muted)] capitalize">{m.role}</p>
                </div>
                {isOwner &&
                  m.role !== "owner" &&
                  m.userId !== currentUserId && (
                    <div className="flex gap-1 shrink-0">
                      {m.role === "member" ? (
                        <button
                          type="button"
                          onClick={() => setModerator(m.userId, true)}
                          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--hit-hover)]"
                        >
                          Make mod
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModerator(m.userId, false)}
                          className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--hit-hover)]"
                        >
                          Remove mod
                        </button>
                      )}
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}

        {isMember && isMod && tab === "requests" && (
          <ul className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-8">
                No pending requests.
              </p>
            ) : (
              requests.map((r) => (
                <li
                  key={r.id}
                  className="card-surface p-4 shadow-sm flex gap-3 flex-wrap"
                >
                  <Link href={`/profile/${r.applicantId}`} className="shrink-0">
                    <Avatar
                      text={r.applicantName.slice(0, 2).toUpperCase()}
                      size="md"
                      imageUrl={r.applicantPhotoURL}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${r.applicantId}`}
                      className="font-medium text-[var(--foreground)] hover:text-[var(--brand)]"
                    >
                      {r.applicantName}
                    </Link>
                    {r.message && (
                      <p className="text-sm text-[var(--foreground)] mt-1 whitespace-pre-wrap">
                        {r.message}
                      </p>
                    )}
                    <p className="text-xs text-[var(--muted)] mt-2">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => reviewRequest(r.id, "accept")}
                      className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewRequest(r.id, "reject")}
                      className="flex-1 sm:flex-none px-3 py-2 border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] hover:bg-[var(--hit-hover)]"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </AppPageContainer>

      {applyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setApplyOpen(false);
            setApplyError(null);
          }}
        >
          <div
            className="card-surface max-w-lg w-full p-6 shadow-lg rounded-[var(--radius-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
              Request to join
            </h2>
            <p className="text-sm text-[var(--muted)] mb-4">{group.name}</p>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Message
            </label>
            <textarea
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg input-surface resize-none mb-4"
              placeholder="Why do you want to join?"
            />
            {applyError && (
              <p className="text-sm text-red-600 mb-3">{applyError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setApplyOpen(false);
                  setApplyError(null);
                }}
                className="px-4 py-2 text-[var(--foreground)] border border-[var(--border)] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitApply}
                disabled={applySubmitting}
                className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {applySubmitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
