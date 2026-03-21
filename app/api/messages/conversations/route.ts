import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import {
  getOrCreateConversation,
  listConversationPreviews,
} from "@/lib/db/messaging";
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

/** GET: inbox previews */
export async function GET() {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conversations = await listConversationPreviews(uid);
  return NextResponse.json({ conversations });
}

/** POST: { otherUserId: number } — returns { conversationId } */
export async function POST(request: Request) {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { otherUserId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const other =
    typeof body.otherUserId === "number" ? body.otherUserId : NaN;
  if (isNaN(other) || other === uid) {
    return NextResponse.json({ error: "Invalid otherUserId" }, { status: 400 });
  }
  const conversationId = await getOrCreateConversation(uid, other);
  if (conversationId == null) {
    return NextResponse.json(
      { error: "Cannot start conversation" },
      { status: 400 }
    );
  }
  return NextResponse.json({ conversationId });
}
