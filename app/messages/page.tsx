"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppNavbar from "@/app/_components/AppNavbar";
import Avatar from "@/app/_components/Avatar";

type Preview = {
  conversationId: number;
  otherUserId: number;
  otherName: string;
  otherPhotoURL: string | null;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

export default function MessagesInboxPage() {
  const [items, setItems] = useState<Preview[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);

  useEffect(() => {
    fetch("/api/messages/conversations", { credentials: "include" })
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
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
        {unauth ? (
          <p className="text-gray-600">Sign in to view messages.</p>
        ) : loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">
            No conversations yet. Open someone&apos;s profile and tap Message to
            start.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {items.map((c) => (
              <li key={c.conversationId}>
                <Link
                  href={`/messages/${c.conversationId}`}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition min-h-[56px] ${
                    c.unread ? "bg-blue-50/50" : ""
                  }`}
                >
                  <Avatar
                    text={c.otherName.slice(0, 2).toUpperCase()}
                    size="md"
                    imageUrl={c.otherPhotoURL}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 truncate">
                        {c.otherName}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(c.lastAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {c.lastBody || "No messages yet"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
