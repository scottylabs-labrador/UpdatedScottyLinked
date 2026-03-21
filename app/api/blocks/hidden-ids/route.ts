import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { getHiddenUserIdsForViewer } from "@/lib/db/blocks";
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

/** GET: user ids to hide in feeds (bidirectional blocks). */
export async function GET() {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ hiddenUserIds: [] });
  }
  const hiddenUserIds = await getHiddenUserIdsForViewer(uid);
  return NextResponse.json({ hiddenUserIds });
}
