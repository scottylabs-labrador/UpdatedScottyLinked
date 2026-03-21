import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { getUserById } from "@/lib/db/users";
import {
  expressProjectInterest,
  getProjectByIdAdmin,
  withdrawProjectInterest,
} from "@/lib/db/projectInterests";
import { insertNotification } from "@/lib/db/notifications";
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

/** POST: express interest in a project listing. Body: { message?: string } */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const applicantId = await getCurrentAppUserId();
  if (applicantId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const message =
    typeof body.message === "string" ? body.message : undefined;

  const result = await expressProjectInterest({
    projectId,
    applicantId,
    message,
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (result.reason === "own_project") {
      return NextResponse.json(
        { error: "You cannot express interest in your own listing" },
        { status: 400 }
      );
    }
    if (result.reason === "duplicate") {
      return NextResponse.json(
        { error: "You already expressed interest" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to save interest" }, { status: 500 });
  }

  const project = await getProjectByIdAdmin(projectId);
  const applicant = await getUserById(applicantId);
  if (project && project.authorid !== applicantId) {
    const preview =
      message && message.length > 120 ? `${message.slice(0, 120)}…` : message;
    await insertNotification({
      userId: project.authorid,
      type: "project_interest",
      title: `Interest in “${project.title}”`,
      body: preview
        ? `${applicant?.fullName ?? "Someone"}: ${preview}`
        : `${applicant?.fullName ?? "Someone"} is interested in your project.`,
      meta: { projectId, applicantId, interestId: result.interestId },
    });
  }

  return NextResponse.json({ ok: true, interestId: result.interestId });
}

/** DELETE: withdraw pending interest */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const applicantId = await getCurrentAppUserId();
  if (applicantId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const ok = await withdrawProjectInterest(projectId, applicantId);
  if (!ok) {
    return NextResponse.json(
      { error: "No pending interest to withdraw" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
