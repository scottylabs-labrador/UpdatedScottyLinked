"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import { AppPageContainer } from "@/app/_components/AppShell";

type Msg = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
};

export default function MessageThreadPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const id = parseInt(conversationId, 10);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [otherName, setOtherName] = useState<string>("");
  const [otherPhoto, setOtherPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    if (isNaN(id)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError(res.status === 404 ? "Conversation not found" : "Failed to load");
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.otherUser) {
        setOtherName(data.otherUser.name ?? "");
        setOtherPhoto(data.otherUser.photoURL ?? null);
      }
      setError(null);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.appUser?.id ?? null));
  }, []);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending || isNaN(id)) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setBody("");
        await loadThread();
      }
    } finally {
      setSending(false);
    }
  };

  if (isNaN(id)) {
    return (
      <AppPageContainer>
          <p className="text-center py-12 text-[var(--muted)] text-sm">
            Invalid conversation
          </p>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer maxWidthClass="max-w-2xl">
        <div className="flex flex-col min-h-[70vh]">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/messages"
            className="text-sm text-[var(--brand)] font-medium hover:underline min-h-[44px] flex items-center"
          >
            ← Inbox
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
          <Avatar
            text={otherName.slice(0, 2).toUpperCase() || "?"}
            size="md"
            imageUrl={otherPhoto}
          />
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {otherName || "Conversation"}
          </h1>
        </div>

        {loading ? (
          <p className="text-[var(--muted)] text-sm">Loading messages…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[60vh]">
            {messages.map((m) => {
              const mine = currentUserId != null && m.senderId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      mine
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface)] border border-[var(--border)] text-gray-900 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word">{m.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        mine ? "text-white/80" : "text-gray-400"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={send} className="mt-auto pt-3 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              disabled={sending || currentUserId == null}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-xl text-gray-900 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            />
            <button
              type="submit"
              disabled={!body.trim() || sending || currentUserId == null}
              className="px-5 py-3 bg-[var(--brand)] text-white font-semibold rounded-xl hover:bg-[var(--brand-hover)] disabled:opacity-50 min-h-[48px] min-w-[88px]"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </form>
        </div>
    </AppPageContainer>
  );
}
