import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { getProjectByIdFull } from "@/lib/db/projects";
import { getPendingInterestsForProject } from "@/lib/db/projectInterests";
import { NextResponse } from "next/server";

async function getCurrentAppUserId(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAndrewEmail(user.email)) return null;
  const handle = getHandleFromEmail(user.email);
  if (!handle) return null;
  const appUser = await getAppUserByHandle(handle);
  return appUser?.id ?? null;
}

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

  const project = await getProjectByIdFull(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewerId = await getCurrentAppUserId();
  const isOwner = viewerId != null && viewerId === project.authorID;

  const out: Record<string, unknown> = { project };
  if (isOwner && viewerId != null) {
    out.interests = await getPendingInterestsForProject(id, viewerId);
  } else {
    out.interests = [];
  }

  return NextResponse.json(out);
}
