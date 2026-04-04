"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppPageContainer } from "@/app/_components/AppShell";

type ReportRow = {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  reason: string;
  details: string | null;
  status: string;
  moderator_notes: string | null;
  handled_by: number | null;
  created_at: string;
  updated_at: string;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter === "all" ? "all" : "open";
      const res = await fetch(`/api/admin/reports?status=${q}`, {
        credentials: "include",
      });
      if (res.status === 403) {
        setForbidden(true);
        setReports([]);
        return;
      }
      const data = await res.json();
      if (res.ok && data.reports) setReports(data.reports);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (forbidden) router.replace("/");
  }, [forbidden, router]);

  const patch = async (
    id: number,
    status: "dismissed" | "resolved"
  ) => {
    setActingId(id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          status,
          moderatorNotes: notesById[id]?.trim() || undefined,
        }),
      });
      if (res.ok) await load();
    } finally {
      setActingId(null);
    }
  };

  if (forbidden) {
    return (
      <AppPageContainer maxWidthClass="max-w-5xl">
        <p className="text-center py-12 text-[var(--muted)] text-sm">
          Redirecting…
        </p>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer maxWidthClass="max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Moderation queue</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--muted)]">Show</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "open" | "all")
              }
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm input-surface"
            >
              <option value="open">Open only</option>
              <option value="all">All statuses</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-[var(--muted)]">Loading reports…</p>
        ) : reports.length === 0 ? (
          <div className="card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
            No reports in this view.
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="card-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)] mb-2">
                  <span className="font-mono">#{r.id}</span>
                  <span>
                    {r.target_type} #{r.target_id}
                  </span>
                  <span
                    className={
                      r.status === "open"
                        ? "text-amber-700 font-medium"
                        : "text-[var(--muted)]"
                    }
                  >
                    {r.status}
                  </span>
                  <span>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mb-1">
                  Reporter user id: {r.reporter_id}
                </p>
                <p className="font-medium text-[var(--foreground)] mb-2">{r.reason}</p>
                {r.details && (
                  <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap mb-3">
                    {r.details}
                  </p>
                )}
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                  Moderator notes (optional)
                </label>
                <textarea
                  value={notesById[r.id] ?? r.moderator_notes ?? ""}
                  onChange={(e) =>
                    setNotesById((prev) => ({
                      ...prev,
                      [r.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface mb-3 resize-y"
                  placeholder="Internal notes…"
                />
                {r.status === "open" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actingId === r.id}
                      onClick={() => patch(r.id, "resolved")}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                    >
                      {actingId === r.id ? "…" : "Resolve"}
                    </button>
                    <button
                      type="button"
                      disabled={actingId === r.id}
                      onClick={() => patch(r.id, "dismissed")}
                      className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] text-sm font-medium rounded-lg hover:bg-[var(--hit-hover)] disabled:opacity-50 min-h-[44px]"
                    >
                      {actingId === r.id ? "…" : "Dismiss"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </AppPageContainer>
  );
}
