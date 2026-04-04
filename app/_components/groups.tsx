"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { GroupListItem } from "@/lib/types";

interface GroupsBrowseProps {
  groups: GroupListItem[];
  loading: boolean;
  currentUserId?: number | null;
  onGroupCreated?: () => void;
}

export default function GroupsBrowse({
  groups,
  loading,
  currentUserId,
  onGroupCreated,
}: GroupsBrowseProps) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = groups.filter((g) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      g.name.toLowerCase().includes(needle) ||
      g.description.toLowerCase().includes(needle)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create group");
      }
      setName("");
      setDescription("");
      onGroupCreated?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--muted)] text-sm">
        Loading groups…
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
          Groups
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Join communities, discuss, and see opportunities shared only inside
          each group.
        </p>
      </div>

      {currentUserId != null && (
        <div className="card-surface p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Create a group
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg input-surface"
                placeholder="e.g. HCI Research Collective"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg input-surface resize-none"
                placeholder="What is this group for?"
                maxLength={2000}
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 font-semibold text-sm min-h-[44px]"
            >
              {submitting ? "Creating…" : "Create group"}
            </button>
          </form>
        </div>
      )}

      <div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Browse</h2>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search groups…"
            className="w-full sm:max-w-xs px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center py-12 text-[var(--muted)] text-sm card-surface p-8 shadow-sm">
            {groups.length === 0
              ? "No groups yet. Create the first one above."
              : "No groups match your search."}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="card-surface p-4 sm:p-5 shadow-sm flex items-start gap-4 hover:border-[var(--brand)]/30 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--brand)] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                        {g.name}
                      </h3>
                      {g.myRole && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                          {g.myRole === "owner"
                            ? "Owner"
                            : g.myRole === "moderator"
                              ? "Moderator"
                              : "Member"}
                        </span>
                      )}
                      {g.joinRequestStatus === "pending" && !g.myRole && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-950 dark:text-amber-100 border border-amber-500/30">
                          Pending request
                        </span>
                      )}
                    </div>
                    {g.description ? (
                      <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                        {g.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-[var(--muted)] mt-2">
                      {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--muted)] shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {currentUserId == null && (
        <p className="text-sm text-center text-[var(--muted)]">
          Sign in to create a group or request to join.
        </p>
      )}
    </div>
  );
}
