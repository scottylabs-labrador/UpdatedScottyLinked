"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/app/_components/Avatar";
import { AppPageContainer } from "@/app/_components/AppShell";
import { createClient } from "@/lib/supabase/client";

type Preview = {
  conversationId: number;
  otherUserId: number;
  otherName: string;
  otherPhotoURL: string | null;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

function InboxSkeleton() {
  return (
    <ul className="divide-y divide-[var(--border)] card-surface overflow-hidden shadow-sm">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="px-4 py-3 flex gap-4 min-h-[56px]">
          <div className="w-10 h-10 rounded-full bg-[var(--chip-bg)] motion-safe:animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 py-1 min-w-0">
            <div className="h-4 bg-[var(--chip-bg)]/80 rounded w-1/3 motion-safe:animate-pulse" />
            <div className="h-3 bg-[var(--chip-bg)]/60 rounded w-4/5 motion-safe:animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MessagesInboxPage() {
  const [items, setItems] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);

  const loadInboxFull = useCallback(() => {
    return fetch("/api/messages/conversations?limit=50", {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          setUnauth(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.conversations) setItems(data.conversations);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r1 = await fetch("/api/messages/conversations?limit=8", {
          credentials: "include",
        });
        if (r1.status === 401) {
          if (!cancelled) setUnauth(true);
          return;
        }
        const d1 = await r1.json();
        if (!cancelled && d1?.conversations) setItems(d1.conversations);
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (cancelled) return;
      try {
        const r2 = await fetch("/api/messages/conversations?limit=50", {
          credentials: "include",
        });
        if (r2.ok) {
          const d2 = await r2.json();
          if (!cancelled && d2?.conversations) setItems(d2.conversations);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inbox-conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          void loadInboxFull();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInboxFull]);

  return (
    <AppPageContainer maxWidthClass="max-w-2xl">
      <h1 className="text-xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
        Messages
      </h1>
      {unauth ? (
        <p className="text-[var(--muted)] text-sm">Sign in to view messages.</p>
      ) : loading && items.length === 0 ? (
        <InboxSkeleton />
      ) : items.length === 0 ? (
        <div className="card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
          No conversations yet. Open someone&apos;s profile and tap Message to
          start.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] card-surface overflow-hidden shadow-sm">
          {items.map((c) => (
            <li key={c.conversationId}>
              <Link
                href={`/messages/${c.conversationId}`}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--hit-hover)] transition min-h-[56px] ${
                  c.unread ? "bg-[var(--notif-unread-row)]" : ""
                }`}
              >
                <Avatar
                  text={c.otherName.slice(0, 2).toUpperCase()}
                  size="md"
                  imageUrl={c.otherPhotoURL}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--foreground)] truncate">
                      {c.otherName}
                    </span>
                    <span className="text-xs text-[var(--muted)] shrink-0">
                      {new Date(c.lastAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] truncate">
                    {c.lastBody || "No messages yet"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppPageContainer>
  );
}
