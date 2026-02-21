import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { getConnectionStatus } from "@/lib/db/connections";
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

/** GET: ?userId= — get connection status with that user. */
export async function GET(request: Request) {
  const currentId = await getCurrentAppUserId();
  if (currentId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const otherId = userIdParam ? parseInt(userIdParam, 10) : NaN;
  if (isNaN(otherId)) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  const supabase = await createClient();
  const result = await getConnectionStatus(supabase, currentId, otherId);
  return NextResponse.json(result);
}
