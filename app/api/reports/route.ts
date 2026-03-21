import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { insertReport, type ReportTargetType } from "@/lib/db/reports";
import { insertNotification } from "@/lib/db/notifications";
import { listModeratorUserIds } from "@/lib/moderation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

async function targetExists(
  type: ReportTargetType,
  id: number
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  if (type === "user") {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return !!data;
  }
  if (type === "post") {
    const { data } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return !!data;
  }
  if (type === "project") {
    const { data } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return !!data;
  }
  if (type === "message") {
    const { data } = await supabaseAdmin
      .from("direct_messages")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    return !!data;
  }
  return false;
}

const TARGETS = new Set<ReportTargetType>(["user", "post", "project", "message"]);

/** POST body: { targetType, targetId, reason, details? } */
export async function POST(request: Request) {
  const reporterId = await getCurrentAppUserId();
  if (reporterId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    targetType?: string;
    targetId?: number;
    reason?: string;
    details?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetType = body.targetType as ReportTargetType;
  const targetId =
    typeof body.targetId === "number" ? body.targetId : NaN;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!TARGETS.has(targetType) || isNaN(targetId) || targetId < 1) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }
  if (targetType === "user" && targetId === reporterId) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
  }
  if (!reason || reason.length < 3) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

  const exists = await targetExists(targetType, targetId);
  if (!exists) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const reportId = await insertReport({
    reporterId,
    targetType,
    targetId,
    reason,
    details: typeof body.details === "string" ? body.details : undefined,
  });

  if (reportId == null) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  const modIds = await listModeratorUserIds();
  for (const modId of modIds) {
    await insertNotification({
      userId: modId,
      type: "moderation_report",
      title: "New report submitted",
      body: `${targetType} #${targetId}: ${reason.slice(0, 120)}`,
      meta: { reportId, targetType, targetId },
    });
  }

  return NextResponse.json({ ok: true, id: reportId });
}
