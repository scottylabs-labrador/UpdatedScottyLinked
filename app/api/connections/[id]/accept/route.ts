import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { acceptConnection } from "@/lib/db/connections";
import { insertNotification } from "@/lib/db/notifications";
import { getUserById } from "@/lib/db/users";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

async function getCurrentAppUserId(): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAndrewEmail(user.email)) return null;
  const handle = getHandleFromEmail(user.email);
  if (!handle) return null;
  const appUser = await getAppUserByHandle(handle);
  return appUser?.id ?? null;
}

/** POST: accept a connection request (caller must be the receiver). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentId = await getCurrentAppUserId();
  if (currentId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let requesterId: number | null = null;
  if (supabaseAdmin) {
    const { data: row } = await supabaseAdmin
      .from("connections")
      .select("requester_id")
      .eq("id", connectionId)
      .eq("status", "pending")
      .maybeSingle();
    requesterId = (row?.requester_id as number) ?? null;
  }

  const supabase = await createClient();
  const ok = await acceptConnection(supabase, connectionId, currentId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
  }

  if (requesterId != null && requesterId !== currentId) {
    const receiver = await getUserById(currentId);
    await insertNotification({
      userId: requesterId,
      type: "connection_accepted",
      title: "Connection accepted",
      body: `${receiver?.fullName ?? "Someone"} accepted your connection request.`,
      meta: { userId: currentId },
    });
  }

  return NextResponse.json({ ok: true });
}
