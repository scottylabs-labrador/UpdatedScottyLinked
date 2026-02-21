import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { getUserLiked, setLike } from "@/lib/db/posts";
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

/** POST: toggle like. Body: { liked: boolean } or empty to toggle. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const currentUserId = await getCurrentAppUserId();
  if (currentUserId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const id = parseInt(postId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  let liked: boolean;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.liked === "boolean") {
      liked = body.liked;
    } else {
      const current = await getUserLiked(id, currentUserId);
      liked = !current;
    }
  } catch {
    const current = await getUserLiked(id, currentUserId);
    liked = !current;
  }

  const supabase = await createClient();
  const result = await setLike(id, currentUserId, liked, supabase);
  return NextResponse.json(result);
}
