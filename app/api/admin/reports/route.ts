import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { listReports, updateReportById } from "@/lib/db/reports";
import { isModeratorUser } from "@/lib/moderation";
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

/** GET ?status=open|all — moderator only */
export async function GET(request: Request) {
  const userId = await getCurrentAppUserId();
  if (userId == null || !(await isModeratorUser(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "open"
    | "dismissed"
    | "resolved"
    | "all"
    | null;
  const reports = await listReports({
    status: status ?? "open",
    limit: 200,
  });
  return NextResponse.json({ reports });
}

/** PATCH body: { id, status: dismissed|resolved, moderatorNotes? } */
export async function PATCH(request: Request) {
  const userId = await getCurrentAppUserId();
  if (userId == null || !(await isModeratorUser(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    id?: number;
    status?: string;
    moderatorNotes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "number" ? body.id : NaN;
  const status = body.status;
  if (isNaN(id) || (status !== "dismissed" && status !== "resolved")) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ok = await updateReportById(id, {
    status,
    moderatorNotes: body.moderatorNotes,
    handledBy: userId,
  });

  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
