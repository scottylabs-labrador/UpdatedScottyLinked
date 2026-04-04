import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { getUserById } from "@/lib/db/users";
import {
  getConversationParticipants,
  insertDirectMessage,
  listOlderMessagesForConversation,
  listRecentMessagesForConversation,
  markMessagesRead,
  userIsInConversation,
  type ThreadMessageRow,
} from "@/lib/db/messaging";
import { insertNotification } from "@/lib/db/notifications";
import { NextResponse } from "next/server";

async function getCurrentAppUserId(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAndrewEmail(user.email)) return null;
  const handle = getHandleFromEmail(user.email);
  if (!handle) return null;
  const appUser = await getAppUserByHandle(handle);
  return appUser?.id ?? null;
}

/** GET: messages in thread. Query: `recent` (default 35, max 100), `before` (ISO created_at) for older page. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId: cid } = await params;
  const id = parseInt(cid, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const participants = await getConversationParticipants(id);
  if (
    !participants ||
    !userIsInConversation(participants, uid)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const recent = Math.min(
    Math.max(parseInt(url.searchParams.get("recent") || "35", 10), 1),
    100
  );
  const before = url.searchParams.get("before")?.trim();

  let messages: ThreadMessageRow[];
  let hasOlder: boolean;

  if (before) {
    const page = await listOlderMessagesForConversation(id, before, recent);
    messages = page.messages;
    hasOlder = page.hasOlder;
  } else {
    const page = await listRecentMessagesForConversation(id, recent);
    messages = page.messages;
    hasOlder = page.hasOlder;
    void markMessagesRead(id, uid);
  }

  const otherId =
    participants.low === uid ? participants.high : participants.low;
  const other = await getUserById(otherId);

  return NextResponse.json({
    messages,
    hasOlder,
    otherUser: other
      ? {
          id: other.id,
          name: other.fullName,
          photoURL: other.photoURL ?? null,
        }
      : null,
  });
}

/** POST: { body: string } — send message */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId: cid } = await params;
  const id = parseInt(cid, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }

  const result = await insertDirectMessage({
    conversationId: id,
    senderId: uid,
    body: text,
  });
  if (!result) {
    return NextResponse.json({ error: "Failed to send" }, { status: 400 });
  }

  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
  const { data: conv } = await supabaseAdmin!
    .from("conversations")
    .select("participant_low_id, participant_high_id")
    .eq("id", id)
    .maybeSingle();
  if (conv) {
    const row = conv as {
      participant_low_id: number;
      participant_high_id: number;
    };
    const recipient =
      row.participant_low_id === uid
        ? row.participant_high_id
        : row.participant_low_id;
    const sender = await getUserById(uid);
    await insertNotification({
      userId: recipient,
      type: "dm",
      title: `Message from ${sender?.fullName ?? "Someone"}`,
      body: text.slice(0, 200),
      meta: { conversationId: id },
    });
  }

  return NextResponse.json({
    ok: true,
    message: {
      id: result.id,
      senderId: result.senderId,
      body: result.body,
      createdAt: result.createdAt,
    },
  });
}
