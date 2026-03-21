import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ReportTargetType = "user" | "post" | "project" | "message";

export type ReportRow = {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  reason: string;
  details: string | null;
  status: string;
  moderator_notes: string | null;
  handled_by: number | null;
  created_at: string;
  updated_at: string;
};

export async function insertReport(params: {
  reporterId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
  details?: string | null;
}): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({
      reporter_id: params.reporterId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: params.reason.slice(0, 500),
      details: params.details?.slice(0, 4000) ?? null,
      status: "open",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("insertReport:", error);
    return null;
  }
  return (data as { id: number }).id;
}

export async function listReports(params: {
  status?: "open" | "dismissed" | "resolved" | "all";
  limit?: number;
}): Promise<ReportRow[]> {
  if (!supabaseAdmin) return [];
  let q = supabaseAdmin.from("reports").select("*").order("created_at", {
    ascending: false,
  });

  if (params.status && params.status !== "all") {
    q = q.eq("status", params.status);
  }

  const { data, error } = await q.limit(params.limit ?? 100);
  if (error || !data) return [];
  return data as ReportRow[];
}

export async function updateReportById(
  reportId: number,
  updates: {
    status: "dismissed" | "resolved";
    moderatorNotes?: string | null;
    handledBy: number;
  }
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { error } = await supabaseAdmin
    .from("reports")
    .update({
      status: updates.status,
      moderator_notes: updates.moderatorNotes ?? null,
      handled_by: updates.handledBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  return !error;
}
