import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  CommunityGroup,
  GroupJoinRequestRow,
  GroupListItem,
  GroupMembershipRole,
} from "@/lib/types";
import { getUsersByIds } from "@/lib/db/users";

function rowToGroup(row: Record<string, unknown>): CommunityGroup {
  return {
    id: row.id as number,
    name: (row.name as string) ?? "",
    description: (row.description as string) ?? "",
    createdBy: (row.created_by as number) ?? (row.createdBy as number),
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string) ?? null,
  };
}

export async function createGroup(params: {
  name: string;
  description: string;
  createdBy: number;
}): Promise<CommunityGroup | null> {
  if (!supabaseAdmin) return null;
  const name = params.name.trim();
  if (!name) return null;

  const { data: g, error: gErr } = await supabaseAdmin
    .from("groups")
    .insert({
      name,
      description: params.description.trim(),
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (gErr || !g) {
    console.error("createGroup:", gErr);
    return null;
  }

  const group = rowToGroup(g as Record<string, unknown>);
  const { error: mErr } = await supabaseAdmin.from("group_memberships").insert({
    group_id: group.id,
    user_id: params.createdBy,
    role: "owner",
  });

  if (mErr) {
    console.error("createGroup membership:", mErr);
    await supabaseAdmin.from("groups").delete().eq("id", group.id);
    return null;
  }

  return group;
}

export async function getGroupById(
  groupId: number
): Promise<CommunityGroup | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToGroup(data as Record<string, unknown>);
}

export async function listGroups(): Promise<CommunityGroup[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToGroup);
}

/** Groups directory with counts and viewer-specific join state (shared with GET /api/groups). */
export async function listGroupsBrowseForViewer(
  viewerId: number | null
): Promise<GroupListItem[]> {
  const groups = await listGroups();
  const items = await Promise.all(
    groups.map(async (g) => {
      const memberCount = await countGroupMembers(g.id);
      const myRole =
        viewerId != null ? await getMembershipRole(g.id, viewerId) : null;
      const joinRequest =
        viewerId != null ? await getJoinRequestRow(g.id, viewerId) : null;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        createdBy: g.createdBy,
        created_at: g.created_at,
        memberCount,
        myRole,
        joinRequestStatus: joinRequest?.status ?? null,
      };
    })
  );
  return items;
}

export async function getMembershipRole(
  groupId: number,
  userId: number
): Promise<GroupMembershipRole | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { role: GroupMembershipRole }).role;
}

export async function isGroupMember(
  groupId: number,
  userId: number
): Promise<boolean> {
  const role = await getMembershipRole(groupId, userId);
  return role != null;
}

/** Single query: which of `groupIds` is `userId` a member of. */
export async function filterGroupIdsWhereMember(
  userId: number,
  groupIds: number[]
): Promise<Set<number>> {
  const unique = [...new Set(groupIds.filter((id) => Number.isFinite(id)))];
  if (!supabaseAdmin || unique.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", userId)
    .in("group_id", unique);
  if (error || !data) return new Set();
  return new Set((data as { group_id: number }[]).map((r) => r.group_id));
}

export async function isGroupModerator(
  groupId: number,
  userId: number
): Promise<boolean> {
  const role = await getMembershipRole(groupId, userId);
  return role === "owner" || role === "moderator";
}

export async function countGroupMembers(groupId: number): Promise<number> {
  if (!supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin
    .from("group_memberships")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (error) return 0;
  return count ?? 0;
}

export type GroupMemberListItem = {
  userId: number;
  fullName: string;
  photoURL: string | null;
  role: GroupMembershipRole;
  joinedAt: string;
};

export async function listGroupMembers(
  groupId: number
): Promise<GroupMemberListItem[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("user_id, role, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  const rows = data as {
    user_id: number;
    role: GroupMembershipRole;
    created_at: string;
  }[];
  const userIds = rows.map((r) => r.user_id);
  const users = await getUsersByIds(userIds);
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = byId.get(r.user_id);
    return {
      userId: r.user_id,
      fullName: u?.fullName ?? "Unknown",
      photoURL: u?.photoURL ?? null,
      role: r.role,
      joinedAt: r.created_at,
    };
  });
}

export async function getJoinRequestById(
  requestId: number
): Promise<GroupJoinRequestRow | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("group_join_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as number,
    groupId: r.group_id as number,
    applicantId: r.applicant_id as number,
    message: (r.message as string) ?? null,
    status: r.status as GroupJoinRequestRow["status"],
    created_at: (r.created_at as string) ?? "",
    reviewedBy: (r.reviewed_by as number) ?? null,
    reviewed_at: (r.reviewed_at as string) ?? null,
  };
}

export async function getJoinRequestRow(
  groupId: number,
  applicantId: number
): Promise<GroupJoinRequestRow | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("group_join_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("applicant_id", applicantId)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as number,
    groupId: r.group_id as number,
    applicantId: r.applicant_id as number,
    message: (r.message as string) ?? null,
    status: r.status as GroupJoinRequestRow["status"],
    created_at: (r.created_at as string) ?? "",
    reviewedBy: (r.reviewed_by as number) ?? null,
    reviewed_at: (r.reviewed_at as string) ?? null,
  };
}

export type SubmitJoinResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "already_member"
        | "duplicate_pending"
        | "not_found"
        | "error";
    };

export async function submitJoinRequest(params: {
  groupId: number;
  applicantId: number;
  message?: string | null;
}): Promise<SubmitJoinResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };

  const g = await getGroupById(params.groupId);
  if (!g) return { ok: false, reason: "not_found" };

  const member = await isGroupMember(params.groupId, params.applicantId);
  if (member) return { ok: false, reason: "already_member" };

  const existing = await getJoinRequestRow(
    params.groupId,
    params.applicantId
  );
  const msg =
    typeof params.message === "string"
      ? params.message.trim().slice(0, 2000)
      : null;

  if (existing?.status === "pending") {
    return { ok: false, reason: "duplicate_pending" };
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("group_join_requests")
      .update({
        status: "pending",
        message: msg,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existing.id);

    if (error) return { ok: false, reason: "error" };
    return { ok: true };
  }

  const { error } = await supabaseAdmin.from("group_join_requests").insert({
    group_id: params.groupId,
    applicant_id: params.applicantId,
    message: msg,
    status: "pending",
  });

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

export async function withdrawJoinRequest(
  groupId: number,
  applicantId: number
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("group_join_requests")
    .update({ status: "withdrawn" })
    .eq("group_id", groupId)
    .eq("applicant_id", applicantId)
    .eq("status", "pending")
    .select("id");

  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export type PendingRequestItem = {
  id: number;
  applicantId: number;
  applicantName: string;
  applicantPhotoURL: string | null;
  message: string | null;
  created_at: string;
};

export async function listPendingJoinRequests(
  groupId: number
): Promise<PendingRequestItem[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("group_join_requests")
    .select("id, applicant_id, message, created_at")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return [];

  const rows = data as {
    id: number;
    applicant_id: number;
    message: string | null;
    created_at: string;
  }[];
  const applicantIds = [...new Set(rows.map((r) => r.applicant_id))];
  const users = await getUsersByIds(applicantIds);
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = byId.get(r.applicant_id);
    return {
      id: r.id,
      applicantId: r.applicant_id,
      applicantName: u?.fullName ?? "Unknown",
      applicantPhotoURL: u?.photoURL ?? null,
      message: r.message,
      created_at: r.created_at,
    };
  });
}

export type ReviewRequestResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_found" | "forbidden" | "bad_status" | "error";
    };

export async function acceptJoinRequest(params: {
  groupId: number;
  requestId: number;
  reviewerId: number;
}): Promise<ReviewRequestResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };

  const mod = await isGroupModerator(params.groupId, params.reviewerId);
  if (!mod) return { ok: false, reason: "forbidden" };

  const { data: req, error: rErr } = await supabaseAdmin
    .from("group_join_requests")
    .select("*")
    .eq("id", params.requestId)
    .eq("group_id", params.groupId)
    .maybeSingle();

  if (rErr || !req) return { ok: false, reason: "not_found" };
  const row = req as Record<string, unknown>;
  if (row.status !== "pending") return { ok: false, reason: "bad_status" };

  const applicantId = row.applicant_id as number;

  const { error: uErr } = await supabaseAdmin
    .from("group_join_requests")
    .update({
      status: "accepted",
      reviewed_by: params.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.requestId);

  if (uErr) return { ok: false, reason: "error" };

  const { error: insErr } = await supabaseAdmin
    .from("group_memberships")
    .insert({
      group_id: params.groupId,
      user_id: applicantId,
      role: "member",
    });

  if (insErr) {
    const msg = insErr.message?.toLowerCase() ?? "";
    if (!msg.includes("duplicate") && !msg.includes("unique")) {
      console.error("acceptJoinRequest membership:", insErr);
      return { ok: false, reason: "error" };
    }
  }

  return { ok: true };
}

export async function rejectJoinRequest(params: {
  groupId: number;
  requestId: number;
  reviewerId: number;
}): Promise<ReviewRequestResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };

  const mod = await isGroupModerator(params.groupId, params.reviewerId);
  if (!mod) return { ok: false, reason: "forbidden" };

  const { data: req, error: rErr } = await supabaseAdmin
    .from("group_join_requests")
    .select("id, status")
    .eq("id", params.requestId)
    .eq("group_id", params.groupId)
    .maybeSingle();

  if (rErr || !req) return { ok: false, reason: "not_found" };
  if ((req as { status: string }).status !== "pending") {
    return { ok: false, reason: "bad_status" };
  }

  const { error } = await supabaseAdmin
    .from("group_join_requests")
    .update({
      status: "rejected",
      reviewed_by: params.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.requestId);

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

export type SetModeratorResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "not_member"
        | "cannot_change_owner"
        | "not_found"
        | "error";
    };

export async function setMemberModeratorStatus(params: {
  groupId: number;
  ownerId: number;
  targetUserId: number;
  moderator: boolean;
}): Promise<SetModeratorResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };

  const ownerRole = await getMembershipRole(params.groupId, params.ownerId);
  if (ownerRole !== "owner") return { ok: false, reason: "forbidden" };

  const targetRole = await getMembershipRole(
    params.groupId,
    params.targetUserId
  );
  if (!targetRole) return { ok: false, reason: "not_member" };
  if (targetRole === "owner") return { ok: false, reason: "cannot_change_owner" };

  const newRole: GroupMembershipRole = params.moderator ? "moderator" : "member";
  if (targetRole === newRole) return { ok: true };

  const { error } = await supabaseAdmin
    .from("group_memberships")
    .update({ role: newRole })
    .eq("group_id", params.groupId)
    .eq("user_id", params.targetUserId);

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

/** Notify all moderators (owner + moderator) of a new join request. */
export async function getModeratorUserIds(groupId: number): Promise<number[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("user_id, role")
    .eq("group_id", groupId)
    .in("role", ["owner", "moderator"]);

  if (error || !data) return [];
  return (data as { user_id: number }[]).map((r) => r.user_id);
}

export async function listGroupIdsForUser(userId: number): Promise<number[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return (data as { group_id: number }[]).map((r) => r.group_id);
}

/** Joined groups with names (for feed composer / filters). */
export async function listJoinedGroupsForUser(
  userId: number
): Promise<{ id: number; name: string }[]> {
  const ids = await listGroupIdsForUser(userId);
  if (!ids.length || !supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("id, name")
    .in("id", ids);
  if (error || !data) return [];
  const rows = data as { id: number; name: string }[];
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getGroupNamesByIds(
  ids: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!supabaseAdmin || ids.length === 0) return map;
  const unique = [...new Set(ids)];
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("id, name")
    .in("id", unique);

  if (error || !data) return map;
  for (const r of data as { id: number; name: string }[]) {
    map.set(r.id, r.name);
  }
  return map;
}

export type LeaveGroupResult =
  | { ok: true }
  | { ok: false; reason: "not_member" | "owner_cannot_leave" | "error" };

export async function leaveGroup(
  groupId: number,
  userId: number
): Promise<LeaveGroupResult> {
  if (!supabaseAdmin) return { ok: false, reason: "error" };
  const role = await getMembershipRole(groupId, userId);
  if (!role) return { ok: false, reason: "not_member" };
  if (role === "owner") return { ok: false, reason: "owner_cannot_leave" };

  const { error } = await supabaseAdmin
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}
