import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { createProjectAdmin } from "@/lib/db/projects";
import { isGroupModerator } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** POST: create a project / teammate listing. */
export async function POST(request: Request) {
  const authorId = await getCurrentAppUserId();
  if (authorId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    skills?: string[];
    level?: string;
    type?: string;
    groupId?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const groupId =
    typeof body.groupId === "number" && Number.isFinite(body.groupId)
      ? body.groupId
      : typeof body.groupId === "string"
        ? parseInt(body.groupId, 10)
        : NaN;
  if (isNaN(groupId)) {
    return NextResponse.json(
      { error: "groupId required — listings are group-scoped only" },
      { status: 400 }
    );
  }

  const canPost = await isGroupModerator(groupId, authorId);
  if (!canPost) {
    return NextResponse.json(
      { error: "Only group moderators can post listings" },
      { status: 403 }
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description required" },
      { status: 400 }
    );
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string")
    : [];

  const project = await createProjectAdmin({
    title,
    description,
    skills,
    level: typeof body.level === "string" ? body.level : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
    authorId,
    groupId,
  });

  if (!project) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ id: (project as { id: number }).id }, { status: 201 });
}
