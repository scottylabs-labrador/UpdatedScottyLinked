import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { searchUsersForNetwork, userToNetworkProfile } from "@/lib/db/users";
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

/** GET ?q=&major=&year= — search students (auth required). */
export async function GET(request: Request) {
  const appUserId = await getCurrentAppUserId();
  if (appUserId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const major = searchParams.get("major")?.trim() ?? "";
  const year = searchParams.get("year")?.trim() ?? "";
  const skill = searchParams.get("skill")?.trim() ?? "";

  if (!q && !major && !year && !skill) {
    return NextResponse.json({ profiles: [] });
  }

  const users = await searchUsersForNetwork(
    {
      q: q || undefined,
      major: major || undefined,
      year: year || undefined,
      skill: skill || undefined,
    },
    appUserId,
    40
  );

  const profiles = users.map(userToNetworkProfile);
  return NextResponse.json({ profiles });
}
