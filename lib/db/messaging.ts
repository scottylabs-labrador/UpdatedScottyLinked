import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasBlockBetween } from "@/lib/db/blocks";
import { getUsersByIds } from "@/lib/db/users";

export function sortedParticipantIds(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(
  userA: number,
  userB: number
): Promise<number | null> {
  if (!supabaseAdmin || userA === userB) return null;
  if (await hasBlockBetween(userA, userB)) return null;

  const [low, high] = sortedParticipantIds(userA, userB);

  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("participant_low_id", low)
    .eq("participant_high_id", high)
    .maybeSingle();

  if (existing) return (existing as { id: number }).id;

  const { data: inserted, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      participant_low_id: low,
      participant_high_id: high,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("getOrCreateConversation:", error);
    return null;
  }
  return (inserted as { id: number }).id;
}

export type ConversationPreview = {
  conversationId: number;
  otherUserId: number;
  otherName: string;
  otherPhotoURL: string | null;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

export async function listConversationPreviews(
  userId: number
): Promise<ConversationPreview[]> {
  if (!supabaseAdmin) return [];
  const db = supabaseAdmin;

  const { data: convs, error } = await db
    .from("conversations")
    .select("id, participant_low_id, participant_high_id, updated_at")
    .or(
      `participant_low_id.eq.${userId},participant_high_id.eq.${userId}`
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !convs?.length) return [];

  const rows = convs as {
    id: number;
    participant_low_id: number;
    participant_high_id: number;
    updated_at: string;
  }[];

  const otherIds = [
    ...new Set(
      rows.map((c) =>
        c.participant_low_id === userId
          ? c.participant_high_id
          : c.participant_low_id
      )
    ),
  ];
  const users = await getUsersByIds(otherIds);
  const userById = new Map(users.map((u) => [u.id, u]));

  const lastMsgResults = await Promise.all(
    rows.map((c) =>
      db
        .from("direct_messages")
        .select("body, created_at, sender_id, read_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  const out: ConversationPreview[] = [];
  rows.forEach((c, i) => {
    const otherId =
      c.participant_low_id === userId
        ? c.participant_high_id
        : c.participant_low_id;
    const other = userById.get(otherId);
    if (!other) return;

    const lastMsg = lastMsgResults[i].data;
    const lm = lastMsg as
      | {
          body: string;
          created_at: string;
          sender_id: number;
          read_at: string | null;
        }
      | null
      | undefined;

    out.push({
      conversationId: c.id,
      otherUserId: otherId,
      otherName: other.fullName,
      otherPhotoURL: other.photoURL,
      lastBody: lm?.body ?? "",
      lastAt: lm?.created_at ?? c.updated_at,
      unread:
        !!lm &&
        lm.sender_id !== userId &&
        lm.read_at == null,
    });
  });

  return out;
}

export async function getConversationParticipants(
  conversationId: number
): Promise<{ low: number; high: number } | null> {
  if (!supabaseAdmin) return null;
  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("participant_low_id, participant_high_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;
  const row = conv as {
    participant_low_id: number;
    participant_high_id: number;
  };
  return { low: row.participant_low_id, high: row.participant_high_id };
}

export function userIsInConversation(
  participants: { low: number; high: number },
  userId: number
): boolean {
  return participants.low === userId || participants.high === userId;
}

export async function listMessagesForConversation(
  conversationId: number,
  _userId: number,
  limit: number = 80
): Promise<
  Array<{
    id: number;
    senderId: number;
    body: string;
    createdAt: string;
  }>
> {
  if (!supabaseAdmin) return [];

  const { data: msgs, error } = await supabaseAdmin
    .from("direct_messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !msgs) return [];

  return (msgs as Record<string, unknown>[]).map((m) => ({
    id: m.id as number,
    senderId: m.sender_id as number,
    body: (m.body as string) ?? "",
    createdAt: (m.created_at as string) ?? "",
  }));
}

export async function insertDirectMessage(params: {
  conversationId: number;
  senderId: number;
  body: string;
}): Promise<{ id: number } | null> {
  if (!supabaseAdmin) return null;
  const body = params.body.trim().slice(0, 8000);
  if (!body) return null;

  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("participant_low_id, participant_high_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conv) return null;
  const row = conv as {
    participant_low_id: number;
    participant_high_id: number;
  };
  if (
    row.participant_low_id !== params.senderId &&
    row.participant_high_id !== params.senderId
  ) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      body,
    })
    .select("id")
    .single();

  if (error || !data) return null;

  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);

  return { id: (data as { id: number }).id };
}

export async function markMessagesRead(
  conversationId: number,
  readerId: number
): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", readerId)
    .is("read_at", null);
}
