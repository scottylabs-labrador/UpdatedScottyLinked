import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { listJoinedGroupsForUser } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** GET: groups the current user is a member of (id + name). */
export async function GET() {
  const userId = await getCurrentAppUserId();
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await listJoinedGroupsForUser(userId);
  return NextResponse.json({ groups });
}
