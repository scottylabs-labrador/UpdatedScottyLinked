import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { getCommentsForPost, addComment } from "@/lib/db/posts";
import { insertNotification } from "@/lib/db/notifications";
import { getUserById } from "@/lib/db/users";
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

/** GET: list comments for the post. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const id = parseInt(postId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const comments = await getCommentsForPost(id);
  return NextResponse.json(comments);
}

/** POST: add a comment (auth required). Body: { content: string } */
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

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const supabase = await createClient();
  const comment = await addComment(id, currentUserId, content, supabase);
  if (!comment) {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }

  const { data: postRow } = await supabase
    .from("posts")
    .select("authorid")
    .eq("id", id)
    .maybeSingle();
  const authorId =
    (postRow?.authorid as number) ?? (postRow as { authorID?: number })?.authorID;
  if (authorId && authorId !== currentUserId) {
    const commenter = await getUserById(currentUserId);
    await insertNotification({
      userId: authorId,
      type: "post_comment",
      title: "New comment on your post",
      body: `${commenter?.fullName ?? "Someone"} commented on your post.`,
      meta: { postId: id },
    });
  }

  return NextResponse.json(comment);
}
