import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserById } from "@/lib/db/users";

export type ProjectInterestRow = {
  id: number;
  project_id: number;
  applicant_id: number;
  message: string | null;
  status: string;
  created_at: string;
};

export async function getProjectByIdAdmin(
  projectId: number
): Promise<{ id: number; authorid: number; title: string } | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, authorid, title")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const authorid = (row.authorid as number) ?? (row.authorID as number);
  if (typeof authorid !== "number") return null;
  return {
    id: row.id as number,
    authorid,
    title: (row.title as string) ?? "",
  };
}

export type ExpressInterestResult =
  | { ok: true; interestId: number }
  | { ok: false; reason: "duplicate" | "own_project" | "not_found" | "error" };

/**
 * Create or re-activate interest. Notifies project owner (caller should invoke insertNotification).
 */
export async function expressProjectInterest(params: {
  projectId: number;
  applicantId: number;
  message?: string | null;
}): Promise<ExpressInterestResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };

  const project = await getProjectByIdAdmin(params.projectId);
  if (!project) return { ok: false, reason: "not_found" };
  if (project.authorid === params.applicantId) {
    return { ok: false, reason: "own_project" };
  }

  const msg =
    typeof params.message === "string" ? params.message.trim().slice(0, 2000) : null;

  const { data: existing, error: selErr } = await supabaseAdmin
    .from("project_interests")
    .select("id, status")
    .eq("project_id", params.projectId)
    .eq("applicant_id", params.applicantId)
    .maybeSingle();

  if (selErr) {
    console.error("expressProjectInterest select:", selErr);
    return { ok: false, reason: "error" };
  }

  const row = existing as { id: number; status: string } | null;
  if (row?.status === "pending") {
    return { ok: false, reason: "duplicate" };
  }

  if (row?.status === "withdrawn" || row?.status === "dismissed") {
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("project_interests")
      .update({
        status: "pending",
        message: msg,
      })
      .eq("id", row.id)
      .select("id")
      .single();

    if (upErr || !updated) {
      console.error("expressProjectInterest update:", upErr);
      return { ok: false, reason: "error" };
    }
    return { ok: true, interestId: (updated as { id: number }).id };
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("project_interests")
    .insert({
      project_id: params.projectId,
      applicant_id: params.applicantId,
      message: msg,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("expressProjectInterest insert:", insErr);
    return { ok: false, reason: "error" };
  }

  return { ok: true, interestId: (inserted as { id: number }).id };
}

export async function withdrawProjectInterest(
  projectId: number,
  applicantId: number
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("project_interests")
    .update({ status: "withdrawn" })
    .eq("project_id", projectId)
    .eq("applicant_id", applicantId)
    .eq("status", "pending")
    .select("id");

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function listPendingProjectIdsForApplicant(
  applicantId: number
): Promise<number[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("project_interests")
    .select("project_id")
    .eq("applicant_id", applicantId)
    .eq("status", "pending");

  if (error || !data) return [];
  return (data as { project_id: number }[]).map((r) => r.project_id);
}

export type IncomingInterestItem = {
  id: number;
  projectId: number;
  projectTitle: string;
  applicantId: number;
  applicantName: string;
  applicantPhotoURL: string | null;
  message: string | null;
  created_at: string;
};

export async function listIncomingInterestsForOwner(
  ownerId: number
): Promise<IncomingInterestItem[]> {
  if (!supabaseAdmin) return [];

  const { data: projects, error: pErr } = await supabaseAdmin
    .from("projects")
    .select("id, title")
    .eq("authorid", ownerId);

  if (pErr || !projects?.length) return [];

  const projectIds = (projects as { id: number; title: string }[]).map((p) => p.id);
  const titleById = new Map(
    (projects as { id: number; title: string }[]).map((p) => [p.id, p.title])
  );

  const { data: interests, error: iErr } = await supabaseAdmin
    .from("project_interests")
    .select("id, project_id, applicant_id, message, created_at")
    .in("project_id", projectIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (iErr || !interests?.length) return [];

  const applicantIds = [
    ...new Set(
      (interests as { applicant_id: number }[]).map((r) => r.applicant_id)
    ),
  ];
  const applicants = await Promise.all(
    applicantIds.map((id) => getUserById(id))
  );
  const userById = new Map(
    applicants.filter(Boolean).map((u) => [u!.id, u!])
  );

  return (interests as ProjectInterestRow[]).map((row) => {
    const u = userById.get(row.applicant_id);
    return {
      id: row.id,
      projectId: row.project_id,
      projectTitle: titleById.get(row.project_id) ?? "Project",
      applicantId: row.applicant_id,
      applicantName: u?.fullName ?? "Unknown",
      applicantPhotoURL: u?.photoURL ?? null,
      message: row.message,
      created_at: row.created_at,
    };
  });
}

/** Pending interests for one project (owner only). */
export async function getPendingInterestsForProject(
  projectId: number,
  ownerId: number
): Promise<IncomingInterestItem[]> {
  const proj = await getProjectByIdAdmin(projectId);
  if (!proj || proj.authorid !== ownerId) return [];

  if (!supabaseAdmin) return [];
  const { data: interests, error: iErr } = await supabaseAdmin
    .from("project_interests")
    .select("id, project_id, applicant_id, message, created_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (iErr || !interests?.length) return [];

  const applicantIds = [
    ...new Set(
      (interests as { applicant_id: number }[]).map((r) => r.applicant_id)
    ),
  ];
  const applicants = await Promise.all(
    applicantIds.map((id) => getUserById(id))
  );
  const userById = new Map(
    applicants.filter(Boolean).map((u) => [u!.id, u!])
  );

  return (interests as ProjectInterestRow[]).map((row) => {
    const u = userById.get(row.applicant_id);
    return {
      id: row.id,
      projectId: row.project_id,
      projectTitle: proj.title,
      applicantId: row.applicant_id,
      applicantName: u?.fullName ?? "Unknown",
      applicantPhotoURL: u?.photoURL ?? null,
      message: row.message,
      created_at: row.created_at,
    };
  });
}
