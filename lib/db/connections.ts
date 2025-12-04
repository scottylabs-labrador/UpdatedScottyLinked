import { supabase } from "@/lib/supabaseClient";

export async function getConnectedUserIds(userId: number, accepted: boolean) {
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

  // Return just the other user's IDs
  const connectedIds = data.map((conn: any) =>
    conn.requester_id === userId ? conn.reciever_id : conn.requester_id
  );

  // remove duplicates
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
