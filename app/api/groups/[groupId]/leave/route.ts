import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { leaveGroup } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** POST: leave group (members/mods only; owner cannot leave). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const userId = await getCurrentAppUserId();
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await leaveGroup(groupId, userId);
  if (!result.ok) {
    if (result.reason === "not_member") {
      return NextResponse.json({ error: "Not a member" }, { status: 404 });
    }
    if (result.reason === "owner_cannot_leave") {
      return NextResponse.json(
        { error: "Group owners cannot leave. Transfer ownership first." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to leave" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
