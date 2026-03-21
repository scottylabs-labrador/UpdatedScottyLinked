import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { createBlock, removeBlock } from "@/lib/db/blocks";
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

/** POST body: { blockedUserId: number } */
export async function POST(request: Request) {
  const blockerId = await getCurrentAppUserId();
  if (blockerId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { blockedUserId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const blockedId =
    typeof body.blockedUserId === "number" ? body.blockedUserId : NaN;
  if (isNaN(blockedId) || blockedId === blockerId) {
    return NextResponse.json({ error: "Invalid blockedUserId" }, { status: 400 });
  }
  const ok = await createBlock(blockerId, blockedId);
  if (!ok) {
    return NextResponse.json({ error: "Could not block" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE body: { blockedUserId: number } */
export async function DELETE(request: Request) {
  const blockerId = await getCurrentAppUserId();
  if (blockerId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { blockedUserId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const blockedId =
    typeof body.blockedUserId === "number" ? body.blockedUserId : NaN;
  if (isNaN(blockedId)) {
    return NextResponse.json({ error: "Invalid blockedUserId" }, { status: 400 });
  }
  await removeBlock(blockerId, blockedId);
  return NextResponse.json({ ok: true });
}
