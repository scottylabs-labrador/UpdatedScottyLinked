import { FeedPost, Opportunity, Profile, UserProfile } from "./types";
import { getFeedPosts } from "./db/posts";
import { getOpportunities } from "./db/opportunities";
import { getProfiles, getUserProfile } from "./db/users";
import { createConnection as createConnectionDb } from "./db/connections";

// ==================== POSTS ====================
export const fetchPosts = async (
  userId: number | null = null,
  connectedUserIds: number[] = [],
  hiddenAuthorIds: number[] = []
): Promise<FeedPost[]> => {
  try {
    return await getFeedPosts(userId, connectedUserIds, 50, hiddenAuthorIds);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

/** Creates a post as the signed-in user (server verifies session). */
export const createPost = async (
  title: string,
  content: string,
  tags: string[] = [],
  audience: string = "public"
): Promise<boolean> => {
  try {
    const postTitle =
      title.trim() || content.substring(0, 50).trim() || "New Post";
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: postTitle,
        content,
        tags,
        audience,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error creating post:", error);
    return false;
  }
};

// ==================== OPPORTUNITIES ====================
export const fetchOpportunities = async (): Promise<Opportunity[]> => {
  try {
    return await getOpportunities();
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return [];
  }
};

// ==================== PROFILES ====================
export const fetchProfiles = async (
  currentUserId: number = 1
): Promise<Profile[]> => {
  try {
    return await getProfiles(currentUserId);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
};

// ==================== CURRENT USER ====================
export const fetchCurrentUser = async (
  userId?: string | number
): Promise<UserProfile | null> => {
  try {
    if (!userId) return null;
    const userIdNumber =
      typeof userId === "string" ? parseInt(userId, 10) : userId;
    if (isNaN(userIdNumber)) return null;

    return await getUserProfile(userIdNumber);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

/**
 * Updates the signed-in user's profile via PATCH /api/me.
 * Maps UserProfile-shaped fields to the API (fullName, major, year, bio).
 */
export const updateUserProfile = async (
  _userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> => {
  try {
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.fullName = updates.name;
    if (updates.major !== undefined) body.major = updates.major;
    if (updates.year !== undefined) body.year = updates.year;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (Object.keys(body).length === 0) return true;

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

// ==================== CONNECTIONS ====================
export const createConnection = async (
  userId: number = 1,
  targetUserId: number
): Promise<boolean> => {
  try {
    await createConnectionDb(userId, targetUserId);
    return true;
  } catch (error) {
    console.error("Error creating connection:", error);
    return false;
  }
};
