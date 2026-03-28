import { getCurrentAppUserId } from "@/lib/api/currentUser";
import {
  submitJoinRequest,
  withdrawJoinRequest,
  listPendingJoinRequests,
  isGroupModerator,
  getGroupById,
  getModeratorUserIds,
} from "@/lib/db/groups";
import { insertNotification } from "@/lib/db/notifications";
import { getUserById } from "@/lib/db/users";
import { NextResponse } from "next/server";

/** GET: pending join requests (moderators only) */
export async function GET(
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

  const mod = await isGroupModerator(groupId, userId);
  if (!mod) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await listPendingJoinRequests(groupId);
  return NextResponse.json({ requests });
}

/** POST: apply to join { message?: string } */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const applicantId = await getCurrentAppUserId();
  if (applicantId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const message =
    typeof body.message === "string" ? body.message : undefined;

  const result = await submitJoinRequest({
    groupId,
    applicantId,
    message,
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (result.reason === "already_member") {
      return NextResponse.json(
        { error: "You are already a member" },
        { status: 400 }
      );
    }
    if (result.reason === "duplicate_pending") {
      return NextResponse.json(
        { error: "You already have a pending request" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }

  const group = await getGroupById(groupId);
  const applicant = await getUserById(applicantId);
  const preview =
    message && message.length > 120 ? `${message.slice(0, 120)}…` : message;
  const modIds = await getModeratorUserIds(groupId);
  for (const mid of modIds) {
    if (mid === applicantId) continue;
    await insertNotification({
      userId: mid,
      type: "group_join_request",
      title: `Join request: ${group?.name ?? "Group"}`,
      body: preview
        ? `${applicant?.fullName ?? "Someone"}: ${preview}`
        : `${applicant?.fullName ?? "Someone"} wants to join.`,
      meta: { groupId },
    });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE: withdraw own pending request */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const applicantId = await getCurrentAppUserId();
  if (applicantId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid } = await params;
  const groupId = parseInt(gid, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const ok = await withdrawJoinRequest(groupId, applicantId);
  if (!ok) {
    return NextResponse.json(
      { error: "No pending request to withdraw" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
