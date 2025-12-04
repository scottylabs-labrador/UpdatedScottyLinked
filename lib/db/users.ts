import { supabase } from "@/lib/supabaseClient";
import { User, Profile, UserProfile } from "@/lib/types";

// Re-export User for backwards compatibility
export type { User };

/**
 * Search for users based on a filter string.
 * Matches handle, fullName, major, or year.
 */
export async function searchUsers(filter: string): Promise<User[]> {
  if (!filter || filter.trim() === "") return [];

  const query = supabase
    .from("users")
    .select("*")
    .or(
      `handle.ilike.%${filter}%,fullName.ilike.%${filter}%,major.ilike.%${filter}%,year.ilike.%${filter}%`
    )
    .order("handle", { ascending: true })
    .limit(25);

  const { data, error } = await query;

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return data as User[];
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

  return data as User;
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

  return data as User[];
}

/**
 * Update a user's profile fields.
 * Only fields provided in updates will be changed.
 */
export async function updateUserProfile(
  userId: number,
  updates: Partial<User>
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    return null;
  }

  return data as User;
}

/**
 * (Optional) Create a new user entry.
 * Useful if you plan to sync with auth signup events.
 */
export async function createUser(user: Omit<User, "id">): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return null;
  }

  return data as User;
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

    // Transform users to Profile format and get connection counts
    const profiles: Profile[] = users.map((user: User) => {
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
        major: user.major || "Undeclared",
        year: user.year || "Unknown",
        skills: [], // Skills not in users table schema, empty for now
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
      major: user.major || "Undeclared",
      year: user.year || "Unknown",
      email: email,
      skills: [], // Skills not in users table schema, empty for now
      bio: user.bio || "",
      connections: connectionCount,
      gpa: "N/A", // GPA not in schema
    };
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}
