import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getConnectedUserIds(userId: Number, accepted: Boolean) {
  const { data, error } = await supabaseAdmin
    .from("connections")
    .select("requesterId, receiverId, status")
    .or(`requesterId.eq.${userId},receiverId.eq.${userId}`)
    .eq("status", accepted ? "accepted" : "pending");

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Return just the other user's IDs
  const connectedIds = data.map((conn) =>
    conn.requesterId === userId ? conn.receiverId : conn.requesterId
  );

  // remove duplicates
  return [...new Set(connectedIds)];
}

export async function createConnection(
  requesterId: Number,
  receiverId: Number
) {
  if (requesterId === receiverId) {
    throw new Error("Users cannot connect to themselves.");
  }

  // Check if connection already exists
  const { data: existing } = await supabaseAdmin
    .from("connections")
    .select("id, status")
    .or(
      `and(senderId.eq.${requesterId},receiverId.eq.${receiverId}),and(senderId.eq.${receiverId},receiverId.eq.${requesterId})`
    )
    .maybeSingle();

  if (existing) {
    throw new Error(
      `Connection already exists with status '${existing.status}'`
    );
  }

  // Create new connection record
  const { data, error } = await supabaseAdmin
    .from("connections")
    .insert([
      {
        senderId: requesterId,
        receiverId: receiverId,
        status: "pending",
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
