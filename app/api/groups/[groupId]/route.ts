import { getCurrentAppUserId } from "@/lib/api/currentUser";
import {
  getGroupById,
  countGroupMembers,
  getMembershipRole,
  getJoinRequestRow,
} from "@/lib/db/groups";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId: gid } = await params;
  const id = parseInt(gid, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const group = await getGroupById(id);
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewerId = await getCurrentAppUserId();
  const memberCount = await countGroupMembers(id);
  const myRole =
    viewerId != null ? await getMembershipRole(id, viewerId) : null;
  const joinRequest =
    viewerId != null ? await getJoinRequestRow(id, viewerId) : null;

  return NextResponse.json({
    group,
    memberCount,
    myRole,
    joinRequest,
  });
}
