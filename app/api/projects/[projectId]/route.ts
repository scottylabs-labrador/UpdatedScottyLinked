import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getProjectByIdFull } from "@/lib/db/projects";
import { getPendingInterestsForProject } from "@/lib/db/projectInterests";
import { isGroupMember } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** GET: project detail; includes pending interests when requester is owner */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: pid } = await params;
  const id = parseInt(pid, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [project, viewerId] = await Promise.all([
    getProjectByIdFull(id),
    getCurrentAppUserId(),
  ]);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const gid = project.groupId;
  if (gid != null && gid > 0) {
    if (viewerId == null || !(await isGroupMember(gid, viewerId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = viewerId != null && viewerId === project.authorID;

  const out: Record<string, unknown> = { project };
  if (isOwner && viewerId != null) {
    out.interests = await getPendingInterestsForProject(id, viewerId);
  } else {
    out.interests = [];
  }

  return NextResponse.json(out);
}
