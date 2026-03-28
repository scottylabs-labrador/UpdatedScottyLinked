import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getGroupPosts } from "@/lib/db/posts";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const viewerId = await getCurrentAppUserId();
  if (viewerId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50)
  );

  const posts = await getGroupPosts(groupId, viewerId, limit);
  return NextResponse.json({ posts });
}
