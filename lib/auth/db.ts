import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { User, ProfileOrganization } from "@/lib/types";
import { rowToUser } from "@/lib/db/users";

const ANDREW_DOMAIN = "@andrew.cmu.edu";

export function getHandleFromEmail(email: string): string | null {
  if (!email?.toLowerCase().endsWith(ANDREW_DOMAIN)) return null;
  return email.slice(0, -ANDREW_DOMAIN.length).trim().toLowerCase();
}

export function isAndrewEmail(email: string): boolean {
  return email?.toLowerCase().endsWith(ANDREW_DOMAIN) ?? false;
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
 */
export async function createAppUser(params: {
  handle: string;
  fullName: string;
  photoURL?: string | null;
  authUserId?: string | null;
}): Promise<User | null> {
  if (!supabaseAdmin) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      handle: params.handle,
      fullname: params.fullName,
      photourl: params.photoURL ?? null,
      auth_user_id: params.authUserId ?? null,
      bannerurl: null,
      major: null,
      minors: null,
      degree: null,
      college: null,
      year: null,
      bio: null,
      linkedin_url: null,
      github_url: null,
      portfolio_url: null,
      resume_url: null,
      campus_roles: [],
      organizations: [],
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

export type AppUserUpdates = {
  fullName?: string;
  major?: string | null;
  minors?: string | null;
  degree?: string | null;
  college?: string | null;
  year?: string | null;
  bio?: string | null;
  photoURL?: string | null;
  bannerURL?: string | null;
  skills?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  resumeUrl?: string | null;
  campusRoles?: string[];
  organizations?: ProfileOrganization[];
};

/**
 * Update an app user by id (server-only, uses admin client).
 */
export async function updateAppUser(
  userId: number,
  updates: AppUserUpdates
): Promise<User | null> {
  if (!supabaseAdmin) return null;

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.fullName !== undefined) row.fullname = updates.fullName;
  if (updates.major !== undefined) row.major = updates.major;
  if (updates.minors !== undefined) row.minors = updates.minors;
  if (updates.degree !== undefined) row.degree = updates.degree;
  if (updates.college !== undefined) row.college = updates.college;
  if (updates.year !== undefined) row.year = updates.year;
  if (updates.bio !== undefined) row.bio = updates.bio;
  if (updates.photoURL !== undefined) row.photourl = updates.photoURL;
  if (updates.bannerURL !== undefined) row.bannerurl = updates.bannerURL;
  if (updates.skills !== undefined) row.skills = updates.skills;
  if (updates.linkedinUrl !== undefined) row.linkedin_url = updates.linkedinUrl;
  if (updates.githubUrl !== undefined) row.github_url = updates.githubUrl;
  if (updates.portfolioUrl !== undefined) row.portfolio_url = updates.portfolioUrl;
  if (updates.resumeUrl !== undefined) row.resume_url = updates.resumeUrl;
  if (updates.campusRoles !== undefined) row.campus_roles = updates.campusRoles;
  if (updates.organizations !== undefined) row.organizations = updates.organizations;

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
 */
export async function ensureAppUser(params: {
  handle: string;
  fullName: string;
  photoURL?: string | null;
  authUserId?: string | null;
}): Promise<User | null> {
  const existing = await getAppUserByHandle(params.handle);
  if (existing) {
    if (params.authUserId && supabaseAdmin) {
      await supabaseAdmin
        .from("users")
        .update({
          auth_user_id: params.authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return existing;
  }
  return createAppUser(params);
}
