import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { hasBlockBetween } from "@/lib/db/blocks";
import { getUserProfile } from "@/lib/db/users";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  let viewerId: number | null = null;
  if (authUser?.email && isAndrewEmail(authUser.email)) {
    const handle = getHandleFromEmail(authUser.email);
    if (handle) {
      const app = await getAppUserByHandle(handle);
      viewerId = app?.id ?? null;
    }
  }

  if (viewerId != null && viewerId !== id) {
    const blocked = await hasBlockBetween(viewerId, id);
    if (blocked) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  const profile = await getUserProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
