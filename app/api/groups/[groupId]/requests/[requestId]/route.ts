import { getCurrentAppUserId } from "@/lib/api/currentUser";
import {
  acceptJoinRequest,
  rejectJoinRequest,
  getGroupById,
  getJoinRequestById,
} from "@/lib/db/groups";
import { insertNotification } from "@/lib/db/notifications";
import { NextResponse } from "next/server";

/** PATCH: { action: "accept" | "reject" } — moderators only */
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ groupId: string; requestId: string }> }
) {
  const reviewerId = await getCurrentAppUserId();
  if (reviewerId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId: gid, requestId: rid } = await params;
  const groupId = parseInt(gid, 10);
  const requestId = parseInt(rid, 10);
  if (isNaN(groupId) || isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "accept" || body.action === "reject" ? body.action : null;
  if (!action) {
    return NextResponse.json(
      { error: "action must be accept or reject" },
      { status: 400 }
    );
  }

  const group = await getGroupById(groupId);
  const before = await getJoinRequestById(requestId);
  const applicantId = before?.applicantId;

  if (action === "accept") {
    const result = await acceptJoinRequest({
      groupId,
      requestId,
      reviewerId,
    });
    if (!result.ok) {
      if (result.reason === "forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (result.reason === "not_found" || result.reason === "bad_status") {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
    if (applicantId != null && group) {
      await insertNotification({
        userId: applicantId,
        type: "group_join_accepted",
        title: `Welcome to ${group.name}`,
        body: "Your join request was accepted.",
        meta: { groupId },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await rejectJoinRequest({
    groupId,
    requestId,
    reviewerId,
  });
  if (!result.ok) {
    if (result.reason === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (result.reason === "not_found" || result.reason === "bad_status") {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  if (applicantId != null && group) {
    await insertNotification({
      userId: applicantId,
      type: "group_join_rejected",
      title: `Join request: ${group.name}`,
      body: "Your request was not accepted.",
      meta: { groupId },
    });
  }

  return NextResponse.json({ ok: true });
}
