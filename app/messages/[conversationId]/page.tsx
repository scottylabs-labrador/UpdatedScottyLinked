"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppNavbar from "@/app/_components/AppNavbar";
import Avatar from "@/app/_components/Avatar";

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
      <div className="min-h-screen bg-gray-50">
        <AppNavbar />
        <p className="text-center py-12 text-gray-600">Invalid conversation</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNavbar />
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/messages"
            className="text-sm text-blue-600 hover:underline min-h-[44px] flex items-center"
          >
            ← Inbox
          </Link>
        </div>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
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
          <p className="text-gray-500">Loading messages…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
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
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        mine ? "text-blue-100" : "text-gray-400"
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

        <form onSubmit={send} className="mt-auto pt-2 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              disabled={sending || currentUserId == null}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 min-h-[48px]"
            />
            <button
              type="submit"
              disabled={!body.trim() || sending || currentUserId == null}
              className="px-5 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 min-h-[48px] min-w-[88px]"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
