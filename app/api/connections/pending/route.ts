import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { getPendingSent, getPendingReceived } from "@/lib/db/connections";
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

/** GET: list pending connection requests (sent and received). */
export async function GET() {
  const currentId = await getCurrentAppUserId();
  if (currentId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createClient();
  const [sent, received] = await Promise.all([
    getPendingSent(supabase, currentId),
    getPendingReceived(supabase, currentId),
  ]);
  return NextResponse.json({ sent, received });
}
