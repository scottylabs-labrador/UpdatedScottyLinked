import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { createConnection as createConnectionDb } from "@/lib/db/connections";
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

/** POST: send a connection request (body: { targetUserId: number }). */
export async function POST(request: Request) {
  const currentId = await getCurrentAppUserId();
  if (currentId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { targetUserId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const targetUserId = typeof body.targetUserId === "number" ? body.targetUserId : undefined;
  if (targetUserId == null) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }
  try {
    await createConnectionDb(currentId, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}
