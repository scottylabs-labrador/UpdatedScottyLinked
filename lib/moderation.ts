import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** True if this user may access moderator APIs (DB flag or env bootstrap). */
export async function isModeratorUser(userId: number | null): Promise<boolean> {
  if (userId == null) return false;

  const envHandles = process.env.MODERATOR_HANDLES?.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (envHandles?.length && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("handle")
      .eq("id", userId)
      .maybeSingle();
    const handle = (data?.handle as string)?.toLowerCase();
    if (handle && envHandles.includes(handle)) return true;
  }

  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_moderator")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return !!(data as { is_moderator?: boolean }).is_moderator;
}

export async function listModeratorUserIds(): Promise<number[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("is_moderator", true);

  if (error || !data) return [];
  return (data as { id: number }[]).map((r) => r.id);
}
