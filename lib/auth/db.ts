import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { User } from "@/lib/types";

const ANDREW_DOMAIN = "@andrew.cmu.edu";

export function getHandleFromEmail(email: string): string | null {
  if (!email?.toLowerCase().endsWith(ANDREW_DOMAIN)) return null;
  return email.slice(0, -ANDREW_DOMAIN.length).trim().toLowerCase();
}

export function isAndrewEmail(email: string): boolean {
  return email?.toLowerCase().endsWith(ANDREW_DOMAIN) ?? false;
}

/**
 * Map DB row (snake_case columns) to User type (camelCase).
 * Postgres/Supabase return lowercase column names (fullname, photourl, bannerurl).
 */
function rowToUser(row: Record<string, unknown> | null): User | null {
  if (!row || typeof row.id !== "number") return null;
  return {
    id: row.id as number,
    handle: (row.handle as string) ?? "",
    fullName: (row.fullname as string) ?? (row.fullName as string) ?? "",
    photoURL: (row.photourl as string | null) ?? (row.photoURL as string | null) ?? null,
    bannerURL: (row.bannerurl as string | null) ?? (row.bannerURL as string | null) ?? null,
    major: (row.major as string | null) ?? null,
    year: (row.year as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

/**
 * Get app user by handle (server-only, uses admin client for RLS bypass).
 */
export async function getAppUserByHandle(handle: string): Promise<User | null> {
  if (!supabaseAdmin || !handle) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user by handle:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown> | null);
}

/**
 * Create a new app user (server-only, uses admin client).
 * Uses DB column names (lowercase: fullname, photourl, bannerurl).
 */
export async function createAppUser(params: {
  handle: string;
  fullName: string;
  photoURL?: string | null;
}): Promise<User | null> {
  if (!supabaseAdmin) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      handle: params.handle,
      fullname: params.fullName,
      photourl: params.photoURL ?? null,
      bannerurl: null,
      major: null,
      year: null,
      bio: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating app user:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown>);
}

/**
 * Update an app user by id (server-only, uses admin client).
 * Only provided fields are updated. Uses DB column names.
 */
export async function updateAppUser(
  userId: number,
  updates: {
    fullName?: string;
    major?: string | null;
    year?: string | null;
    bio?: string | null;
    photoURL?: string | null;
    bannerURL?: string | null;
  }
): Promise<User | null> {
  if (!supabaseAdmin) return null;

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.fullName !== undefined) row.fullname = updates.fullName;
  if (updates.major !== undefined) row.major = updates.major;
  if (updates.year !== undefined) row.year = updates.year;
  if (updates.bio !== undefined) row.bio = updates.bio;
  if (updates.photoURL !== undefined) row.photourl = updates.photoURL;
  if (updates.bannerURL !== undefined) row.bannerurl = updates.bannerURL;

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(row)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating app user:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown>);
}

/**
 * Ensure an app user exists for the given handle; create if unseen.
 * Returns the user (existing or newly created).
 */
export async function ensureAppUser(params: {
  handle: string;
  fullName: string;
  photoURL?: string | null;
}): Promise<User | null> {
  const existing = await getAppUserByHandle(params.handle);
  if (existing) return existing;
  return createAppUser(params);
}
