import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getGroupOpportunities } from "@/lib/db/opportunities";
import { NextResponse } from "next/server";

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

  const opportunities = await getGroupOpportunities(groupId, viewerId);
  return NextResponse.json({ opportunities });
}
