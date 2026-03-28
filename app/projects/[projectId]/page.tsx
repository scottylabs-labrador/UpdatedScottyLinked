"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import ReportModal from "@/app/_components/ReportModal";
import { AppPageContainer } from "@/app/_components/AppShell";
import { Project } from "@/lib/types";

type IncomingInterest = {
  id: number;
  projectId: number;
  applicantId: number;
  applicantName: string;
  applicantPhotoURL: string | null;
  message: string | null;
  created_at: string;
};

function formatPosted(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  return date.toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  const [project, setProject] = useState<Project | null>(null);
  const [interests, setInterests] = useState<IncomingInterest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [hasInterest, setHasInterest] = useState(false);

  const load = useCallback(async () => {
    if (isNaN(projectId)) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      setError(res.status === 404 ? "Project not found" : "Failed to load");
      setProject(null);
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setInterests(data.interests ?? []);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.appUser?.id ?? null));
  }, []);

  useEffect(() => {
    if (currentUserId == null || !project) return;
    fetch("/api/projects/interests/mine", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const ids: number[] = data.projectIds ?? [];
        setHasInterest(ids.includes(project.id));
      })
      .catch(() => {});
  }, [currentUserId, project]);

  const submitInterest = async () => {
    if (!project || currentUserId == null) return;
    setInterestSubmitting(true);
    setInterestError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: interestMessage.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setHasInterest(true);
      setInterestOpen(false);
      setInterestMessage("");
      load();
    } catch (err) {
      setInterestError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setInterestSubmitting(false);
    }
  };

  const withdrawInterest = async () => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/interest`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setHasInterest(false);
        load();
      }
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <AppPageContainer>
        <p className="text-center py-12 text-[var(--muted)] text-sm">Loading…</p>
      </AppPageContainer>
    );
  }

  if (error || !project) {
    return (
      <AppPageContainer maxWidthClass="max-w-2xl">
          <div className="text-center py-12">
            <p className="text-gray-700">{error ?? "Not found"}</p>
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

  const isOwner =
    currentUserId != null && currentUserId === project.authorID;

  return (
    <>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="project"
        targetId={project.id}
      />
      <AppPageContainer>
        <Link
          href="/?tab=groups"
          className="text-sm text-[var(--brand)] hover:underline mb-4 inline-block font-medium"
        >
          ← Groups
        </Link>

        <div className="card-surface p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-1">
                Posted by{" "}
                <Link
                  href={`/profile/${project.authorID}`}
                  className="font-medium text-[var(--brand)] hover:underline"
                >
                  {project.author}
                </Link>
                {" · "}
                <span className="text-gray-500">{formatPosted(project.created_at)}</span>
              </p>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-md text-xs font-semibold uppercase tracking-wide shrink-0">
              {project.type || "Project"}
            </span>
          </div>

          <p className="text-gray-800 whitespace-pre-wrap mb-6">{project.description}</p>

          {project.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {currentUserId == null ? (
              <p className="text-sm text-gray-500">Sign in to express interest.</p>
            ) : isOwner ? (
              <p className="text-sm text-gray-600">This is your listing.</p>
            ) : hasInterest ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <span className="flex-1 text-center py-2 px-4 bg-green-50 text-green-800 rounded-lg font-medium border border-green-200">
                  Interest sent
                </span>
                <button
                  type="button"
                  onClick={withdrawInterest}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
                >
                  Withdraw
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInterestOpen(true);
                  setInterestMessage("");
                  setInterestError(null);
                }}
                className="w-full sm:w-auto py-3 px-6 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] font-semibold min-h-[48px]"
              >
                Express interest
              </button>
            )}
            {currentUserId != null && !isOwner && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="text-sm text-red-700 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 min-h-[44px]"
              >
                Report listing
              </button>
            )}
          </div>
        </div>

        {isOwner && interests.length > 0 && (
          <div className="mt-8 card-surface overflow-hidden shadow-sm">
            <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending interest
              </h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {interests.map((item) => (
                <li key={item.id} className="px-6 py-4 flex gap-4">
                  <Link href={`/profile/${item.applicantId}`} className="shrink-0">
                    <Avatar
                      text={item.applicantName.slice(0, 2).toUpperCase()}
                      size="md"
                      imageUrl={item.applicantPhotoURL}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      <Link
                        href={`/profile/${item.applicantId}`}
                        className="hover:text-[var(--brand)] hover:underline"
                      >
                        {item.applicantName}
                      </Link>
                    </p>
                    {item.message && (
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {item.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AppPageContainer>

      {interestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setInterestOpen(false);
            setInterestError(null);
          }}
        >
          <div
            className="card-surface max-w-lg w-full p-6 shadow-lg rounded-[var(--radius-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Express interest
            </h2>
            <p className="text-sm text-gray-600 mb-4">{project.title}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              rows={4}
              placeholder="Introduce yourself…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none mb-4"
              disabled={interestSubmitting}
            />
            {interestError && (
              <p className="text-sm text-red-600 mb-3">{interestError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setInterestOpen(false);
                  setInterestError(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={interestSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitInterest}
                disabled={interestSubmitting}
                className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 font-semibold min-h-[44px]"
              >
                {interestSubmitting ? "Sending…" : "Send interest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
