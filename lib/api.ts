import { FeedPost, Opportunity, Profile, UserProfile, NewPost } from "./types";
import { getFeedPosts, createPost as createPostDb } from "./db/posts";
import { getOpportunities } from "./db/opportunities";
import { getProfiles, getUserProfile } from "./db/users";
import { createConnection as createConnectionDb } from "./db/connections";

// ==================== POSTS ====================
export const fetchPosts = async (
  userId: number | null = null
): Promise<FeedPost[]> => {
  try {
    return await getFeedPosts(userId);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

export const createPost = async (
  title: string,
  content: string,
  tags: string[] = [],
  audience: string = "public",
  userId: number = 1
): Promise<boolean> => {
  try {
    // Use provided title or generate from content
    const postTitle =
      title.trim() || content.substring(0, 50).trim() || "New Post";

    const newPost: NewPost = {
      title: postTitle,
      content: content,
      authorId: userId,
      audience: audience,
      tags: tags,
    };

    const post = await createPostDb(newPost);
    return post !== null;
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

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> => {
  try {
    // TODO: Uncomment when database is ready
    // const { error } = await supabase
    //   .from('profiles')
    //   .update(updates)
    //   .eq('id', userId);
    //
    // if (error) throw error;
    // return true;

    console.log("Updating profile:", userId, updates);
    return true;
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
