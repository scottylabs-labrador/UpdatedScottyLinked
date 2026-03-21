import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PendingSentItem = {
  id: number;
  receiverId: number;
  receiverName: string;
  receiverPhotoURL: string | null;
};
export type PendingReceivedItem = {
  id: number;
  requesterId: number;
  requesterName: string;
  requesterPhotoURL: string | null;
};

export async function getConnectedUserIds(
  userId: number | null,
  accepted: boolean
) {
  if (userId == null) return [];
  const { data, error } = await supabase
    .from("connections")
    .select("requester_id, reciever_id, status")
    .or(`requester_id.eq.${userId},reciever_id.eq.${userId}`)
    .eq("status", accepted ? "accepted" : "pending");

  if (error) {
    console.error("Error fetching connections:", error);
    return [];
  }
  if (!data) return [];

  const connectedIds = data.map((conn: any) =>
    conn.requester_id === userId ? conn.reciever_id : conn.requester_id
  );
  return [...new Set(connectedIds)];
}

/** Server-side: accepted connection peer ids (service role). */
export async function getConnectedUserIdsAdmin(
  userId: number | null
): Promise<number[]> {
  if (userId == null || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("connections")
    .select("requester_id, reciever_id")
    .or(`requester_id.eq.${userId},reciever_id.eq.${userId}`)
    .eq("status", "accepted");

  if (error || !data) return [];

  const connectedIds = data.map((conn: { requester_id: number; reciever_id: number }) =>
    conn.requester_id === userId ? conn.reciever_id : conn.requester_id
  );
  return [...new Set(connectedIds)];
}

export async function createConnection(
  requesterId: number,
  receiverId: number
) {
  if (requesterId === receiverId) {
    throw new Error("Users cannot connect to themselves.");
  }

  // Check if connection already exists
  const { data: existing } = await supabase
    .from("connections")
    .select("id, status")
    .or(
      `and(requester_id.eq.${requesterId},reciever_id.eq.${receiverId}),and(requester_id.eq.${receiverId},reciever_id.eq.${requesterId})`
    )
    .maybeSingle();

  if (existing) {
    throw new Error(
      `Connection already exists with status '${existing.status}'`
    );
  }

  // Create new connection record
  const { data, error } = await supabase
    .from("connections")
    .insert([
      {
        requester_id: requesterId,
        reciever_id: receiverId,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/** Get pending requests sent by userId (for server; pass createClient() from server). */
export async function getPendingSent(
  sb: SupabaseClient,
  userId: number
): Promise<PendingSentItem[]> {
  const { data: rows, error } = await sb
    .from("connections")
    .select("id, reciever_id")
    .eq("requester_id", userId)
    .eq("status", "pending");
  if (error || !rows?.length) return [];
  const ids = rows.map((r: any) => r.reciever_id);
  const { data: users } = await sb
    .from("users")
    .select("id, fullname, photourl")
    .in("id", ids);
  const byId = new Map(
    (users ?? []).map((u: any) => [
      u.id,
      {
        name: (u.fullname as string) ?? "",
        photoURL: (u.photourl as string | null) ?? null,
      },
    ])
  );
  return rows.map((r: any) => {
    const o = byId.get(r.reciever_id) ?? { name: "", photoURL: null };
    return {
      id: r.id,
      receiverId: r.reciever_id,
      receiverName: o.name,
      receiverPhotoURL: o.photoURL,
    };
  });
}

/** Get pending requests received by userId (for server). */
export async function getPendingReceived(
  sb: SupabaseClient,
  userId: number
): Promise<PendingReceivedItem[]> {
  const { data: rows, error } = await sb
    .from("connections")
    .select("id, requester_id")
    .eq("reciever_id", userId)
    .eq("status", "pending");
  if (error || !rows?.length) return [];
  const ids = rows.map((r: any) => r.requester_id);
  const { data: users } = await sb
    .from("users")
    .select("id, fullname, photourl")
    .in("id", ids);
  const byId = new Map(
    (users ?? []).map((u: any) => [
      u.id,
      {
        name: (u.fullname as string) ?? "",
        photoURL: (u.photourl as string | null) ?? null,
      },
    ])
  );
  return rows.map((r: any) => {
    const o = byId.get(r.requester_id) ?? { name: "", photoURL: null };
    return {
      id: r.id,
      requesterId: r.requester_id,
      requesterName: o.name,
      requesterPhotoURL: o.photoURL,
    };
  });
}

/** Get status between current user and another user (for server). Returns status and connectionId when pending. */
export async function getConnectionStatus(
  sb: SupabaseClient,
  currentUserId: number,
  otherUserId: number
): Promise<
  | { status: "none" }
  | { status: "connected" }
  | { status: "pending_sent"; connectionId: number }
  | { status: "pending_received"; connectionId: number }
> {
  const { data, error } = await sb
    .from("connections")
    .select("id, requester_id, reciever_id, status")
    .or(
      `and(requester_id.eq.${currentUserId},reciever_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},reciever_id.eq.${currentUserId})`
    )
    .maybeSingle();
  if (error || !data) return { status: "none" };
  if (data.status === "accepted") return { status: "connected" };
  if (data.requester_id === currentUserId) {
    return { status: "pending_sent", connectionId: data.id };
  }
  return { status: "pending_received", connectionId: data.id };
}

/** Accept a pending request (receiver only). Returns true if updated. */
export async function acceptConnection(
  sb: SupabaseClient,
  connectionId: number,
  receiverId: number
): Promise<boolean> {
  const { data: row, error: fetchErr } = await sb
    .from("connections")
    .select("id, reciever_id")
    .eq("id", connectionId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr || !row || row.reciever_id !== receiverId) return false;
  const { error: updateErr } = await sb
    .from("connections")
    .update({ status: "accepted" })
    .eq("id", connectionId);
  return !updateErr;
}

/** Reject a pending request (receiver only). */
export async function rejectConnection(
  sb: SupabaseClient,
  connectionId: number,
  receiverId: number
): Promise<boolean> {
  const { data: row, error: fetchErr } = await sb
    .from("connections")
    .select("id, reciever_id")
    .eq("id", connectionId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr || !row || row.reciever_id !== receiverId) return false;
  const { error: updateErr } = await sb
    .from("connections")
    .update({ status: "rejected" })
    .eq("id", connectionId);
  return !updateErr;
}

/** Cancel a pending request (requester only). */
export async function cancelConnection(
  sb: SupabaseClient,
  connectionId: number,
  requesterId: number
): Promise<boolean> {
  const { data: row, error: fetchErr } = await sb
    .from("connections")
    .select("id, requester_id")
    .eq("id", connectionId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchErr || !row || row.requester_id !== requesterId) return false;
  const { error: deleteErr } = await sb
    .from("connections")
    .delete()
    .eq("id", connectionId);
  return !deleteErr;
}
