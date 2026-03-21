"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/app/_components/AppNavbar";

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
      <div className="min-h-screen bg-gray-50">
        <AppNavbar />
        <p className="text-center py-12 text-gray-600">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Moderation queue</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "open" | "all")
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
            >
              <option value="open">Open only</option>
              <option value="all">All statuses</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading reports…</p>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No reports in this view.
          </div>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li
                key={r.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                  <span className="font-mono">#{r.id}</span>
                  <span>
                    {r.target_type} #{r.target_id}
                  </span>
                  <span
                    className={
                      r.status === "open"
                        ? "text-amber-700 font-medium"
                        : "text-gray-600"
                    }
                  >
                    {r.status}
                  </span>
                  <span>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Reporter user id: {r.reporter_id}
                </p>
                <p className="font-medium text-gray-900 mb-2">{r.reason}</p>
                {r.details && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                    {r.details}
                  </p>
                )}
                <label className="block text-xs font-medium text-gray-600 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mb-3 resize-y"
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
                      className="px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                    >
                      {actingId === r.id ? "…" : "Dismiss"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
