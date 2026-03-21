import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import {
  listNotificationsForUser,
  markNotificationsRead,
} from "@/lib/db/notifications";
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

/** GET: list notifications for the signed-in user. */
export async function GET() {
  const userId = await getCurrentAppUserId();
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await listNotificationsForUser(userId);
  const unread = items.filter((n) => n.read_at == null).length;
  return NextResponse.json({ items, unread });
}

/** PATCH: body { ids: number[] } mark as read. */
export async function PATCH(request: Request) {
  const userId = await getCurrentAppUserId();
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is number => typeof id === "number")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: true });
  }
  await markNotificationsRead(userId, ids);
  return NextResponse.json({ ok: true });
}
