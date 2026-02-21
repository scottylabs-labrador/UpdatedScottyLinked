import { supabase } from "@/lib/supabaseClient";
import { User, Profile, UserProfile } from "@/lib/types";

// Re-export User for backwards compatibility
export type { User };

/** Map DB row (snake_case: fullname, photourl, bannerurl) to User (camelCase). */
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
 * Useful for feeds, followers, connections, etc.
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
  if (u.year !== undefined) row.year = u.year;
  if (u.bio !== undefined) row.bio = u.bio;
  return row;
}

/**
 * Update a user's profile fields.
 * Only fields provided in updates will be changed.
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
 * (Optional) Create a new user entry.
 * Uses DB column names (fullname, photourl, bannerurl).
 */
export async function createUser(user: Omit<User, "id">): Promise<User | null> {
  const row = {
    handle: user.handle,
    fullname: user.fullName,
    photourl: user.photoURL ?? null,
    bannerurl: user.bannerURL ?? null,
    major: user.major ?? null,
    year: user.year ?? null,
    bio: user.bio ?? null,
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

/**
 * Get all users as Profile format for network view
 */
export async function getProfiles(
  currentUserId: number = 1,
  limit: number = 50
): Promise<Profile[]> {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .neq("id", currentUserId) // Exclude current user
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    if (!users) return [];

    const userList = (users as Record<string, unknown>[]).map((row) => rowToUser(row)).filter((u): u is User => u != null);

    // Transform users to Profile format and get connection counts
    const profiles: Profile[] = userList.map((user) => {
      // Connection counts require admin access, set to 0 for now
      // Can be implemented via API route if needed
      const connectionCount = 0;

      // Generate avatar initials
      const getAvatarInitials = (name: string | null): string => {
        if (!name) return "?";
        const parts = name.split(" ");
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
      };

      return {
        id: user.id,
        name: user.fullName,
        avatar: getAvatarInitials(user.fullName),
        photoURL: user.photoURL ?? null,
        major: user.major || "Undeclared",
        year: user.year || "Unknown",
        skills: [],
        bio: user.bio || "",
        connections: connectionCount,
      };
    });

    return profiles;
  } catch (error) {
    console.error("Error in getProfiles:", error);
    return [];
  }
}

/**
 * Get a single user as UserProfile format for profile view
 * Note: email and gpa are not in the schema, so we'll use handle as email placeholder
 */
export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  try {
    const user = await getUserById(userId);
    if (!user) return null;

    // Connection counts require admin access, set to 0 for now
    // Can be implemented via API route if needed
    const connectionCount = 0;

    // Generate avatar initials
    const getAvatarInitials = (name: string | null): string => {
      if (!name) return "?";
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    // Use handle as email placeholder (format: handle@andrew.cmu.edu)
    const email = user.handle ? `${user.handle}@andrew.cmu.edu` : "";

    return {
      name: user.fullName,
      avatar: getAvatarInitials(user.fullName),
      photoURL: user.photoURL ?? null,
      major: user.major || "Undeclared",
      year: user.year || "Unknown",
      email: email,
      skills: [],
      bio: user.bio || "",
      connections: connectionCount,
      gpa: "N/A",
    };
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}
