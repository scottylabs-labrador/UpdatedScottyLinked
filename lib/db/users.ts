import { supabase } from "@/lib/supabaseClient";

export interface User {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  bannerURL: string | null;
  major: string | null;
  year: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string | null;
}

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
