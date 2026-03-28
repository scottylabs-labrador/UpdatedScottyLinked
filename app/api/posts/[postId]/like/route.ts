import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getUserLiked, setLike, viewerMayAccessPost } from "@/lib/db/posts";
import { NextResponse } from "next/server";

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

  const allowed = await viewerMayAccessPost(id, currentUserId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
