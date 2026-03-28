import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getConnectedUserIdsAdmin } from "@/lib/db/connections";
import { getPostById } from "@/lib/db/posts";
import { NextResponse } from "next/server";

/** GET: fetch a single post by ID (FeedPost shape). Optional auth for liked state. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const id = parseInt(postId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const currentUserId = await getCurrentAppUserId();
  const connectedIds =
    currentUserId != null
      ? await getConnectedUserIdsAdmin(currentUserId)
      : [];
  const post = await getPostById(id, currentUserId, connectedIds);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  return NextResponse.json(post);
}
