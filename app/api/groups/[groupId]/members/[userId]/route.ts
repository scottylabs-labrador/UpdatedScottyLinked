import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { setMemberModeratorStatus } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** PATCH: { moderator: boolean } — owner only */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const ownerId = await getCurrentAppUserId();
  if (ownerId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid, userId: uid } = await params;
  const groupId = parseInt(gid, 10);
  const targetUserId = parseInt(uid, 10);
  if (isNaN(groupId) || isNaN(targetUserId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { moderator?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.moderator !== "boolean") {
    return NextResponse.json({ error: "moderator boolean required" }, { status: 400 });
  }

  const result = await setMemberModeratorStatus({
    groupId,
    ownerId,
    targetUserId,
    moderator: body.moderator,
  });

  if (!result.ok) {
    if (result.reason === "forbidden") {
      return NextResponse.json({ error: "Only the owner can change moderators" }, { status: 403 });
    }
    if (result.reason === "not_member") {
      return NextResponse.json({ error: "User is not in this group" }, { status: 404 });
    }
    if (result.reason === "cannot_change_owner") {
      return NextResponse.json({ error: "Cannot change the owner role" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
