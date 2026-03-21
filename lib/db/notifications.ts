import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AppNotification = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export async function insertNotification(params: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      meta: params.meta ?? {},
    });
    if (error) {
      console.warn("notifications insert:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("notifications insert failed", e);
    return false;
  }
}

export async function listNotificationsForUser(
  userId: number,
  limit: number = 40
): Promise<AppNotification[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("listNotifications:", error.message);
    return [];
  }

  return (data ?? []) as AppNotification[];
}

export async function markNotificationsRead(
  userId: number,
  ids: number[]
): Promise<boolean> {
  if (!supabaseAdmin || ids.length === 0) return false;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    console.warn("markNotificationsRead:", error.message);
    return false;
  }
  return true;
}
