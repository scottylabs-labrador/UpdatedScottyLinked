"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import { AppPageContainer } from "@/app/_components/AppShell";
import { createClient } from "@/lib/supabase/client";

type Msg = {
  id: number;
  senderId: number;
  body: string;
  createdAt: string;
  clientTempId?: string;
  pending?: boolean;
};

function msgFromRealtimeRow(row: Record<string, unknown>): Msg | null {
  if (typeof row.id !== "number") return null;
  if (typeof row.sender_id !== "number") return null;
  if (typeof row.body !== "string") return null;
  if (typeof row.created_at !== "string") return null;
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

const RECENT = 32;

export default function MessageThreadPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const id = parseInt(conversationId, 10);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [otherName, setOtherName] = useState<string>("");
  const [otherPhoto, setOtherPhoto] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollPreserve = useRef<{ prevHeight: number; prevTop: number } | null>(
    null
  );
  const prevThreadMeta = useRef<{ len: number; firstRealId: number | null }>({
    len: 0,
    firstRealId: null,
  });
  /** Avoid auto-loading older messages before initial scroll-to-bottom runs. */
  const allowOlderScrollLoad = useRef(false);

  const loadRecent = useCallback(async () => {
    if (isNaN(id)) return;
    setListLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/messages/${id}?recent=${RECENT}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        setError(
          res.status === 404 ? "Conversation not found" : "Failed to load"
        );
        setMessages([]);
        setHasOlder(false);
        return;
      }
      const data = (await res.json()) as {
        messages?: Msg[];
        hasOlder?: boolean;
        otherUser?: { name?: string; photoURL?: string | null };
      };
      setMessages(data.messages ?? []);
      setHasOlder(!!data.hasOlder);
      if (data.otherUser) {
        setOtherName(data.otherUser.name ?? "");
        setOtherPhoto(data.otherUser.photoURL ?? null);
      }
    } catch {
      setError("Failed to load");
    } finally {
      setListLoading(false);
    }
  }, [id]);

  const loadOlder = useCallback(async () => {
    if (isNaN(id) || !hasOlder || loadingOlder || listLoading) return;
    const firstReal = messages.find((m) => m.id > 0);
    if (!firstReal) return;

    const el = scrollRef.current;
    if (el) {
      scrollPreserve.current = {
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
    }

    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/messages/${id}?recent=${RECENT}&before=${encodeURIComponent(firstReal.createdAt)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages?: Msg[];
        hasOlder?: boolean;
      };
      const older = data.messages ?? [];
      setHasOlder(!!data.hasOlder);
      setMessages((prev) => {
        const seen = new Set(
          prev.filter((m) => m.id > 0).map((m) => m.id)
        );
        const merged = older.filter((m) => !seen.has(m.id));
        return [...merged, ...prev];
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [id, hasOlder, loadingOlder, listLoading, messages]);

  useEffect(() => {
    const p = scrollPreserve.current;
    const el = scrollRef.current;
    if (!p || !el) return;
    requestAnimationFrame(() => {
      const delta = el.scrollHeight - p.prevHeight;
      el.scrollTop = p.prevTop + delta;
      scrollPreserve.current = null;
    });
  }, [messages]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.appUser?.id ?? null));
  }, []);

  useEffect(() => {
    prevThreadMeta.current = { len: 0, firstRealId: null };
    void loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (isNaN(id)) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dm-thread-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const m = msgFromRealtimeRow(row);
          if (!m) return;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id && x.id > 0)) return prev;
            const withoutDupPending = prev.filter(
              (x) =>
                !(
                  x.pending &&
                  x.senderId === m.senderId &&
                  x.body === m.body
                )
            );
            return [...withoutDupPending, m].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (listLoading) return;
    const firstReal = messages.find((m) => m.id > 0);
    const firstId = firstReal?.id ?? null;
    const prev = prevThreadMeta.current;
    const grew = messages.length > prev.len;
    const prepended =
      grew &&
      firstId != null &&
      prev.firstRealId != null &&
      firstId !== prev.firstRealId;
    prevThreadMeta.current = { len: messages.length, firstRealId: firstId };
    if (!grew || prepended) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, listLoading]);

  useEffect(() => {
    allowOlderScrollLoad.current = false;
    if (listLoading) return;
    const t = window.setTimeout(() => {
      allowOlderScrollLoad.current = true;
    }, 500);
    return () => window.clearTimeout(t);
  }, [listLoading, id]);

  useEffect(() => {
    const root = scrollRef.current;
    const el = topSentinelRef.current;
    if (!root || !el || !hasOlder || listLoading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (!allowOlderScrollLoad.current) return;
        void loadOlder();
      },
      { root, rootMargin: "48px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasOlder, listLoading, loadOlder]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || isNaN(id) || currentUserId == null) return;

    const clientTempId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `t-${Date.now()}`;

    const optimistic: Msg = {
      id: -Date.now(),
      senderId: currentUserId,
      body: text,
      createdAt: new Date().toISOString(),
      clientTempId,
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    void (async () => {
      try {
        const res = await fetch(`/api/messages/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ body: text }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: Msg;
          error?: string;
        };
        if (res.ok && data.message) {
          const confirmed = data.message;
          setMessages((prev) => {
            const dropped = prev.filter((m) => m.clientTempId !== clientTempId);
            if (dropped.some((x) => x.id === confirmed.id)) return dropped;
            return [...dropped, confirmed].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          });
        } else {
          setMessages((prev) =>
            prev.filter((m) => m.clientTempId !== clientTempId)
          );
          setBody(text);
        }
      } catch {
        setMessages((prev) =>
          prev.filter((m) => m.clientTempId !== clientTempId)
        );
        setBody(text);
      }
    })();
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
          <h1 className="text-lg font-semibold text-[var(--foreground)] truncate">
            {otherName || "Conversation"}
          </h1>
        </div>

        {error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[60vh]"
          >
            {hasOlder && !listLoading && (
              <div
                ref={topSentinelRef}
                className="min-h-[1px] flex justify-center py-2"
                aria-hidden
              >
                {loadingOlder && (
                  <span className="text-xs text-[var(--muted)]">
                    Loading older…
                  </span>
                )}
              </div>
            )}

            {listLoading && (
              <div className="space-y-3 py-2" aria-busy>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className="h-14 max-w-[70%] rounded-2xl bg-[var(--chip-bg)]/80 motion-safe:animate-pulse"
                      style={{ width: `${60 + (i % 3) * 12}%` }}
                    />
                  </div>
                ))}
              </div>
            )}

            {!listLoading &&
              messages.map((m) => {
                const mine =
                  currentUserId != null && m.senderId === currentUserId;
                return (
                  <div
                    key={m.clientTempId ?? String(m.id)}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition-opacity ${
                        mine
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] shadow-sm"
                      } ${m.pending ? "opacity-85" : ""}`}
                    >
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {m.body}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          mine ? "text-white/80" : "text-[var(--muted)]"
                        }`}
                      >
                        {m.pending
                          ? "Sending…"
                          : new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            <div ref={bottomRef} />
          </div>
        )}

        <form
          onSubmit={send}
          className="mt-auto pt-3 border-t border-[var(--border)]"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              disabled={currentUserId == null}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-xl input-surface min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
            />
            <button
              type="submit"
              disabled={!body.trim() || currentUserId == null}
              className="px-5 py-3 bg-[var(--brand)] text-white font-semibold rounded-xl hover:bg-[var(--brand-hover)] disabled:opacity-50 min-h-[48px] min-w-[88px]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </AppPageContainer>
  );
}
