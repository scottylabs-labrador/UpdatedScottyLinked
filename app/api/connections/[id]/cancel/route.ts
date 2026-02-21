import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { cancelConnection } from "@/lib/db/connections";
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

/** POST: cancel a connection request (caller must be the requester). */
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
  const supabase = await createClient();
  const ok = await cancelConnection(supabase, connectionId, currentId);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden or not found" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
