import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { listGroupMembers, isGroupMember } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** GET: member list (members only) */
export async function GET(
  _request: Request,
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

  const member = await isGroupMember(groupId, viewerId);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await listGroupMembers(groupId);
  return NextResponse.json({ members });
}
