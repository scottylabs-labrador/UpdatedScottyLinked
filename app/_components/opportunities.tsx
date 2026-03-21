"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { Opportunity } from "@/lib/types";

type IncomingItem = {
  id: number;
  projectId: number;
  projectTitle: string;
  applicantId: number;
  applicantName: string;
  applicantPhotoURL: string | null;
  message: string | null;
  created_at: string;
};

interface OpportunitiesProps {
  opportunities: Opportunity[];
  loading: boolean;
  currentUserId?: number | null;
  onProjectCreated?: () => void;
}

export default function Opportunities({
  opportunities,
  loading,
  currentUserId,
  onProjectCreated,
}: OpportunitiesProps) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [projectType, setProjectType] = useState("Project");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingInterestIds, setPendingInterestIds] = useState<Set<number>>(
    new Set()
  );
  const [incoming, setIncoming] = useState<IncomingItem[]>([]);
  const [interestModalOpp, setInterestModalOpp] = useState<Opportunity | null>(
    null
  );
  const [interestMessage, setInterestMessage] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  const loadInterestState = useCallback(async () => {
    if (currentUserId == null) {
      setPendingInterestIds(new Set());
      setIncoming([]);
      return;
    }
    try {
      const [mineRes, incRes] = await Promise.all([
        fetch("/api/projects/interests/mine", { credentials: "include" }),
        fetch("/api/projects/interests/incoming", { credentials: "include" }),
      ]);
      if (mineRes.ok) {
        const data = await mineRes.json();
        const ids: number[] = data.projectIds ?? [];
        setPendingInterestIds(new Set(ids));
      }
      if (incRes.ok) {
        const data = await incRes.json();
        setIncoming(data.items ?? []);
      }
    } catch {
      setPendingInterestIds(new Set());
      setIncoming([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadInterestState();
  }, [loadInterestState]);

  const filtered = opportunities.filter((opp) => {
    if (typeFilter !== "all" && opp.type !== typeFilter) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      opp.title.toLowerCase().includes(needle) ||
      opp.description.toLowerCase().includes(needle) ||
      opp.skills.some((s) => s.toLowerCase().includes(needle))
    );
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const skillList = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          skills: skillList,
          type: projectType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post project");
      }
      setTitle("");
      setDescription("");
      setSkills("");
      onProjectCreated?.();
      loadInterestState();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const submitInterest = async () => {
    if (!interestModalOpp || currentUserId == null) return;
    setInterestSubmitting(true);
    setInterestError(null);
    try {
      const res = await fetch(
        `/api/projects/${interestModalOpp.id}/interest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: interestMessage.trim() || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send");
      }
      setPendingInterestIds((prev) => new Set(prev).add(interestModalOpp.id));
      setInterestModalOpp(null);
      setInterestMessage("");
      loadInterestState();
    } catch (err) {
      setInterestError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setInterestSubmitting(false);
    }
  };

  const withdrawInterest = async (projectId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/interest`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPendingInterestIds((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        loadInterestState();
      }
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading opportunities...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {interestModalOpp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="interest-modal-title"
          onClick={() => {
            setInterestModalOpp(null);
            setInterestMessage("");
            setInterestError(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="interest-modal-title"
              className="text-lg font-semibold text-gray-900 mb-1"
            >
              Express interest
            </h2>
            <p className="text-sm text-gray-600 mb-4">{interestModalOpp.title}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              rows={4}
              placeholder="Introduce yourself and what you bring to the project..."
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
                  setInterestModalOpp(null);
                  setInterestMessage("");
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {interestSubmitting ? "Sending..." : "Send interest"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentUserId != null && incoming.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Incoming interest on your listings
            </h2>
            <p className="text-sm text-gray-600">
              Students who want to join your projects
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {incoming.map((item) => (
              <li key={item.id} className="px-6 py-4 flex gap-4">
                <Link
                  href={`/profile/${item.applicantId}`}
                  className="shrink-0"
                >
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
                      className="hover:text-blue-600 hover:underline"
                    >
                      {item.applicantName}
                    </Link>
                    <span className="text-gray-600 font-normal">
                      {" "}
                      on{" "}
                      <span className="font-medium text-gray-800">
                        {item.projectTitle}
                      </span>
                    </span>
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

      {currentUserId != null && (
        <div className="mb-8 bg-white rounded-lg shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Post a project / find teammates
          </h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <input
              type="text"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
              disabled={submitting}
            />
            <textarea
              placeholder="What are you building? Who are you looking for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none"
              disabled={submitting}
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Skills (comma-separated)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                disabled={submitting}
              />
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                disabled={submitting}
              >
                <option value="Project">Project</option>
                <option value="Research">Research</option>
                <option value="Hackathon">Hackathon</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {submitting ? "Posting..." : "Publish listing"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search opportunities..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
        >
          <option value="all">All Types</option>
          <option value="Internships">Internships</option>
          <option value="Research">Research</option>
          <option value="Project">Projects</option>
          <option value="Hackathon">Hackathon</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No opportunities match your filters. Post one above or check back soon!
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((opp) => {
            const isOwner =
              currentUserId != null && opp.authorId === currentUserId;
            const hasInterest = pendingInterestIds.has(opp.id);

            return (
              <div
                key={opp.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      <Link
                        href={`/projects/${opp.id}`}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {opp.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 font-medium">{opp.company}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {opp.type}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{opp.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span>📍 {opp.location}</span>
                  <span>⏰ Posted {opp.posted}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {opp.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {currentUserId == null ? (
                  <p className="text-center text-sm text-gray-500 py-2">
                    Sign in to express interest
                  </p>
                ) : isOwner ? (
                  <p className="text-center text-sm text-gray-500 py-2">
                    This is your listing
                  </p>
                ) : hasInterest ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <span className="flex-1 text-center py-2 bg-green-50 text-green-800 rounded-lg font-medium border border-green-200">
                      Interest sent
                    </span>
                    <button
                      type="button"
                      onClick={() => withdrawInterest(opp.id)}
                      className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Withdraw
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setInterestModalOpp(opp);
                      setInterestMessage("");
                      setInterestError(null);
                    }}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Express interest
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
