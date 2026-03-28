"use client";

import React, { useState } from "react";

type TargetType = "user" | "post" | "project" | "message";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: number;
}

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError("Please give a short reason (at least 3 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType,
          targetId,
          reason: reason.trim(),
          details: details.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setReason("");
      setDetails("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-[var(--radius-card)] border border-[var(--border)] shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Report content</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          Reporting {targetType} #{targetId}. Moderators will review this report.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
          placeholder="Brief summary"
          disabled={submitting}
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Details (optional)
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-gray-900 resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
          disabled={submitting}
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] border border-[var(--border)] rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 min-h-[40px] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-semibold"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
