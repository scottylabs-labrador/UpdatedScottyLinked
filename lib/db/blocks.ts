import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** User IDs the viewer should not see in feeds / profiles (either direction block). */
export async function getHiddenUserIdsForViewer(
  viewerId: number
): Promise<number[]> {
  if (!supabaseAdmin) return [];

  const { data: outBlocks, error: e1 } = await supabaseAdmin
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId);

  const { data: inBlocks, error: e2 } = await supabaseAdmin
    .from("blocks")
    .select("blocker_id")
    .eq("blocked_id", viewerId);

  if (e1 || e2) return [];

  const ids = new Set<number>();
  (outBlocks as { blocked_id: number }[] | null)?.forEach((r) =>
    ids.add(r.blocked_id)
  );
  (inBlocks as { blocker_id: number }[] | null)?.forEach((r) =>
    ids.add(r.blocker_id)
  );
  return [...ids];
}

export async function createBlock(
  blockerId: number,
  blockedId: number
): Promise<boolean> {
  if (!supabaseAdmin || blockerId === blockedId) return false;
  const { error } = await supabaseAdmin.from("blocks").insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  return !error;
}

export async function removeBlock(
  blockerId: number,
  blockedId: number
): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { error } = await supabaseAdmin
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return !error;
}

export async function hasBlockBetween(a: number, b: number): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data: r1 } = await supabaseAdmin
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", a)
    .eq("blocked_id", b)
    .maybeSingle();
  if (r1) return true;
  const { data: r2 } = await supabaseAdmin
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", b)
    .eq("blocked_id", a)
    .maybeSingle();
  return !!r2;
}
