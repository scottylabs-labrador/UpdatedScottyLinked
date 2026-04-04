import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  User,
  Profile,
  UserProfile,
  ProfileOrganization,
} from "@/lib/types";
import { mergeNotificationPrefs } from "@/lib/notificationPrefs";
import { isThemeMode } from "@/lib/theme";

// Re-export User for backwards compatibility
export type { User };

function parseOrganizations(raw: unknown): ProfileOrganization[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileOrganization[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      typeof (item as { name: unknown }).name === "string"
    ) {
      const name = String((item as { name: string }).name)
        .trim()
        .slice(0, 120);
      if (!name) continue;
      const role =
        "role" in item &&
        typeof (item as { role?: unknown }).role === "string"
          ? String((item as { role: string }).role).trim().slice(0, 80)
          : undefined;
      out.push(role ? { name, role } : { name });
    }
    if (out.length >= 24) break;
  }
  return out;
}

/** Map DB row (snake_case) to User (camelCase). Exported for auth/db. */
export function rowToUser(row: Record<string, unknown> | null): User | null {
  if (!row || typeof row.id !== "number") return null;
  const skillsRaw = row.skills as string[] | undefined | null;
  const campusRaw = row.campus_roles as string[] | undefined | null;
  const campusRoles = Array.isArray(campusRaw)
    ? campusRaw
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];
  return {
    id: row.id as number,
    handle: (row.handle as string) ?? "",
    fullName: (row.fullname as string) ?? (row.fullName as string) ?? "",
    photoURL: (row.photourl as string | null) ?? (row.photoURL as string | null) ?? null,
    bannerURL: (row.bannerurl as string | null) ?? (row.bannerURL as string | null) ?? null,
    major: (row.major as string | null) ?? null,
    minors: (row.minors as string | null) ?? null,
    degree: (row.degree as string | null) ?? null,
    college: (row.college as string | null) ?? null,
    year: (row.year as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    linkedinUrl: (row.linkedin_url as string | null) ?? null,
    githubUrl: (row.github_url as string | null) ?? null,
    portfolioUrl: (row.portfolio_url as string | null) ?? null,
    resumeUrl: (row.resume_url as string | null) ?? null,
    campusRoles,
    organizations: parseOrganizations(row.organizations),
    created_at: (row.created_at as string) ?? "",
    updated_at: (row.updated_at as string | null) ?? null,
    isModerator: !!(row.is_moderator as boolean | undefined),
    skills: Array.isArray(skillsRaw) ? skillsRaw : [],
    discoverable: row.discoverable === false ? false : true,
    notificationPrefs: mergeNotificationPrefs(row.notification_prefs),
    theme: isThemeMode(row.theme) ? row.theme : "light",
  };
}

function avatarInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/** Map User to API / UI profile shape. */
export function userToUserProfile(
  user: User,
  connectionCount = 0
): UserProfile {
  const email = user.handle ? `${user.handle}@andrew.cmu.edu` : "";
  return {
    id: user.id,
    name: user.fullName,
    handle: user.handle,
    avatar: avatarInitials(user.fullName),
    photoURL: user.photoURL ?? null,
    bannerURL: user.bannerURL ?? null,
    major: user.major?.trim() || "Undeclared",
    minors: user.minors?.trim() || "",
    degree: user.degree?.trim() || "",
    college: user.college?.trim() || "",
    year: user.year?.trim() || "Unknown",
    email,
    skills: user.skills ?? [],
    bio: user.bio?.trim() || "",
    connections: connectionCount,
    linkedinUrl: user.linkedinUrl?.trim() || "",
    githubUrl: user.githubUrl?.trim() || "",
    portfolioUrl: user.portfolioUrl?.trim() || "",
    resumeUrl: user.resumeUrl?.trim() || "",
    campusRoles: user.campusRoles ?? [],
    organizations: user.organizations ?? [],
  };
}

/**
 * Search for users based on a filter string.
 * Matches handle, fullname, major, or year (DB columns are lowercase).
 */
export async function searchUsers(filter: string): Promise<User[]> {
  if (!filter || filter.trim() === "") return [];

  const query = supabase
    .from("users")
    .select("*")
    .or(
      `handle.ilike.%${filter}%,fullname.ilike.%${filter}%,major.ilike.%${filter}%,year.ilike.%${filter}%`
    )
    .order("handle", { ascending: true })
    .limit(25);

  const { data, error } = await query;

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => rowToUser(row as Record<string, unknown>))
    .filter((u): u is User => u != null);
}

export type NetworkSearchFilters = {
  q?: string;
  major?: string;
  year?: string;
  /** Match if any user skill contains this substring (case-insensitive). */
  skill?: string;
};

/**
 * Server-side search for Network tab (service role). Optional text + major/year filters.
 */
export async function searchUsersForNetwork(
  filters: NetworkSearchFilters,
  excludeUserId?: number,
  maxFetch: number = 200
): Promise<User[]> {
  if (!supabaseAdmin) return [];

  let query = supabaseAdmin.from("users").select("*");

  const q = filters.q?.trim();
  if (q) {
    query = query.or(
      `handle.ilike.%${q}%,fullname.ilike.%${q}%,major.ilike.%${q}%,year.ilike.%${q}%`
    );
  }

  const major = filters.major?.trim();
  if (major) {
    query = query.ilike("major", `%${major}%`);
  }

  const year = filters.year?.trim();
  if (year) {
    query = query.ilike("year", `%${year}%`);
  }

  if (excludeUserId != null) {
    query = query.neq("id", excludeUserId);
  }

  query = query.eq("discoverable", true);

  const fetchCap = Math.min(Math.max(maxFetch, 1), 220);
  const { data, error } = await query
    .order("handle", { ascending: true })
    .limit(fetchCap);

  if (error) {
    console.error("Error searching users (admin):", error);
    return [];
  }

  let users = (data ?? [])
    .map((row) => rowToUser(row as Record<string, unknown>))
    .filter((u): u is User => u != null);

  const skill = filters.skill?.trim();
  if (skill) {
    const s = skill.toLowerCase();
    users = users.filter((u) =>
      (u.skills ?? []).some((k) => k.toLowerCase().includes(s))
    );
  }

  return users;
}

/** Slice a pre-fetched search list for infinite scroll (offset/limit). */
export function sliceUsersForNetworkPage(
  users: User[],
  offset: number,
  limit: number
): { page: User[]; hasMore: boolean } {
  const slice = users.slice(offset, offset + limit + 1);
  const hasMore = slice.length > limit;
  return { page: slice.slice(0, limit), hasMore };
}

/**
 * Fetch a single user by handle (e.g. andrew id from email).
 */
export async function getUserByHandle(handle: string): Promise<User | null> {
  if (!handle || !handle.trim()) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("handle", handle.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("Error fetching user by handle:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown> | null);
}

/**
 * Fetch a single user by ID.
 */
export async function getUserById(userId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown> | null);
}

/**
 * Fetch multiple users given an array of IDs.
 */
export async function getUsersByIds(userIds: number[]): Promise<User[]> {
  if (!userIds || userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", userIds);

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => rowToUser(row as Record<string, unknown>))
    .filter((u): u is User => u != null);
}

/** Map User camelCase to DB snake_case for writes. */
function userToRow(u: Partial<User>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (u.fullName !== undefined) row.fullname = u.fullName;
  if (u.photoURL !== undefined) row.photourl = u.photoURL;
  if (u.bannerURL !== undefined) row.bannerurl = u.bannerURL;
  if (u.handle !== undefined) row.handle = u.handle;
  if (u.major !== undefined) row.major = u.major;
  if (u.minors !== undefined) row.minors = u.minors;
  if (u.degree !== undefined) row.degree = u.degree;
  if (u.college !== undefined) row.college = u.college;
  if (u.year !== undefined) row.year = u.year;
  if (u.bio !== undefined) row.bio = u.bio;
  if (u.skills !== undefined) row.skills = u.skills;
  if (u.linkedinUrl !== undefined) row.linkedin_url = u.linkedinUrl;
  if (u.githubUrl !== undefined) row.github_url = u.githubUrl;
  if (u.portfolioUrl !== undefined) row.portfolio_url = u.portfolioUrl;
  if (u.resumeUrl !== undefined) row.resume_url = u.resumeUrl;
  if (u.campusRoles !== undefined) row.campus_roles = u.campusRoles;
  if (u.organizations !== undefined) row.organizations = u.organizations;
  return row;
}

/**
 * Update a user's profile fields.
 */
export async function updateUserProfile(
  userId: number,
  updates: Partial<User>
): Promise<User | null> {
  const row = userToRow(updates);
  const { data, error } = await supabase
    .from("users")
    .update(row)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown> | null);
}

/**
 * Create a new user entry.
 */
export async function createUser(user: Omit<User, "id">): Promise<User | null> {
  const row = {
    handle: user.handle,
    fullname: user.fullName,
    photourl: user.photoURL ?? null,
    bannerurl: user.bannerURL ?? null,
    major: user.major ?? null,
    minors: user.minors ?? null,
    degree: user.degree ?? null,
    college: user.college ?? null,
    year: user.year ?? null,
    bio: user.bio ?? null,
    linkedin_url: user.linkedinUrl ?? null,
    github_url: user.githubUrl ?? null,
    portfolio_url: user.portfolioUrl ?? null,
    resume_url: user.resumeUrl ?? null,
    campus_roles: user.campusRoles ?? [],
    organizations: user.organizations ?? [],
    created_at: new Date().toISOString(),
    updated_at: null,
  };
  const { data, error } = await supabase
    .from("users")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return null;
  }

  return rowToUser(data as Record<string, unknown> | null);
}

function usersToNetworkProfiles(userList: User[]): Profile[] {
  const getAvatarInitials = (name: string | null): string => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return userList.map((user) => ({
    id: user.id,
    name: user.fullName,
    avatar: getAvatarInitials(user.fullName),
    photoURL: user.photoURL ?? null,
    major: user.major || "Undeclared",
    year: user.year || "Unknown",
    skills: user.skills ?? [],
    bio: user.bio || "",
    connections: 0,
  }));
}

export type ProfilesPage = {
  profiles: Profile[];
  nextOffset: number;
  hasMore: boolean;
};

/**
 * Paginated profiles for Network (newest first), excluding current user.
 */
export async function getProfilesPaginated(
  currentUserId: number,
  pageSize: number,
  offset: number
): Promise<ProfilesPage> {
  try {
    const size = Math.max(1, Math.min(pageSize, 50));
    const start = Math.max(0, offset);
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .neq("id", currentUserId)
      .eq("discoverable", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + size);

    if (error) {
      console.error("Error fetching profiles:", error);
      return { profiles: [], nextOffset: start, hasMore: false };
    }

    if (!users?.length) {
      return { profiles: [], nextOffset: start, hasMore: false };
    }

    const userList = (users as Record<string, unknown>[])
      .map((row) => rowToUser(row))
      .filter((u): u is User => u != null);

    const hasMore = userList.length > size;
    const slice = hasMore ? userList.slice(0, size) : userList;
    return {
      profiles: usersToNetworkProfiles(slice),
      nextOffset: start + slice.length,
      hasMore,
    };
  } catch (error) {
    console.error("Error in getProfilesPaginated:", error);
    return { profiles: [], nextOffset: offset, hasMore: false };
  }
}

/**
 * Get users as Profile format for network view (first page only; use getProfilesPaginated for scroll).
 */
export async function getProfiles(
  currentUserId: number = 1,
  limit: number = 50
): Promise<Profile[]> {
  const { profiles } = await getProfilesPaginated(currentUserId, limit, 0);
  return profiles;
}

/** Map a User row to Network `Profile` card shape. */
export function userToNetworkProfile(user: User): Profile {
  return {
    id: user.id,
    name: user.fullName,
    avatar: avatarInitials(user.fullName),
    photoURL: user.photoURL ?? null,
    major: user.major || "Undeclared",
    year: user.year || "Unknown",
    skills: user.skills ?? [],
    bio: user.bio || "",
    connections: 0,
  };
}

/**
 * Get a single user as UserProfile format for profile view
 */
export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  try {
    const user = await getUserById(userId);
    if (!user) return null;
    return userToUserProfile(user, 0);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}
