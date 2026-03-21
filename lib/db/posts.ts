import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { NewPost, FeedPost, Post } from "@/lib/types";
import { getUsersByIds, getUserById } from "./users";

const postRow = (p: Record<string, unknown>) => ({
  id: p.id as number,
  authorID: (p.authorid as number) ?? (p.authorID as number),
  audience: (p.audience as string) ?? "",
  title: (p.title as string) ?? "",
  content: (p.content as string) ?? "",
  tags: (p.tags as string[]) ?? [],
  created_at: (p.created_at as string) ?? "",
});

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function formatMajor(major: string | null, year: string | null): string {
  if (!major && !year) return "";
  if (major && year) return `${major} '${year?.slice(-2)}`;
  if (major) return major;
  return `Class of ${year}`;
}

function getAvatarInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export interface PostCommentWithAuthor {
  id: number;
  authorId: number;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  createdAt: string;
}

/**
 * Create a new post in the database
 */
export async function createPost(
  post: NewPost,
  sb?: SupabaseClient
): Promise<Post | null> {
  const client = sb ?? supabase;
  try {
    const title =
      post.title || post.content.substring(0, 50).trim() || "New Post";

    const authorId =
      typeof post.authorId === "string"
        ? parseInt(post.authorId, 10)
        : post.authorId;
    const { data, error } = await client
      .from("posts")
      .insert({
        title: title,
        content: post.content,
        authorid: authorId,
        tags: post.tags || [],
        audience: post.audience,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return null;
    }

    return data as Post;
  } catch (error) {
    console.error("Error in createPost:", error);
    return null;
  }
}

function canViewerSeePost(
  audience: string,
  authorId: number,
  viewerId: number | null,
  connectedToViewer: Set<number>
): boolean {
  if (audience === "public") return true;
  if (viewerId == null) return false;
  if (audience === "private") return authorId === viewerId;
  if (audience === "connections") {
    return authorId === viewerId || connectedToViewer.has(authorId);
  }
  return false;
}

/**
 * Get posts for feed with user information.
 * Public posts: everyone. Connections-only: viewer must be connected to author (or be author).
 * Private: author only.
 */
export async function getFeedPosts(
  userId: number | null = null,
  connectedUserIds: number[] = [],
  limit: number = 50,
  hiddenAuthorIds: number[] = []
): Promise<FeedPost[]> {
  try {
    const connectedSet = new Set(connectedUserIds);
    const hiddenSet = new Set(hiddenAuthorIds);
    const { data: rawPosts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("Error fetching posts:", error);
      return [];
    }

    const posts = (rawPosts ?? [])
      .map((p) => postRow(p as Record<string, unknown>))
      .filter((p) =>
        canViewerSeePost(p.audience, p.authorID, userId, connectedSet)
      )
      .filter((p) => !hiddenSet.has(p.authorID))
      .slice(0, limit);

    if (posts.length === 0) {
      return [];
    }

    const authorIds = [...new Set(posts.map((p) => p.authorID))];
    const authors = await getUsersByIds(authorIds);

    const postIds = posts.map((p) => p.id);
    const { data: commentsData } = await supabase
      .from("postcomments")
      .select("postid")
      .in("postid", postIds);

    const commentCounts = new Map<number, number>();
    if (commentsData) {
      (commentsData as Record<string, unknown>[]).forEach((comment) => {
        const postId = (comment.postid as number) ?? (comment.postID as number);
        commentCounts.set(postId, (commentCounts.get(postId) || 0) + 1);
      });
    }

    let likeCounts = new Map<number, number>();
    const likedPostIds = new Set<number>();
    try {
      const { data: likesData } = await supabase
        .from("postlikes")
        .select("postid, userid")
        .in("postid", postIds);
      if (likesData) {
        (likesData as Record<string, unknown>[]).forEach((row) => {
          const postId = (row.postid as number) ?? (row.postID as number);
          likeCounts.set(postId, (likeCounts.get(postId) || 0) + 1);
          if (userId != null && (row.userid as number) === userId) {
            likedPostIds.add(postId);
          }
        });
      }
    } catch {
      // postlikes table may not exist yet
    }

    const feedPosts: FeedPost[] = posts.map((post) => {
      const author = authors.find((user) => user.id === post.authorID);
      return {
        id: post.id,
        author: author?.fullName || "Unknown",
        authorId: author?.id,
        authorPhotoURL: author?.photoURL ?? null,
        major: formatMajor(author?.major || null, author?.year || null),
        avatar: getAvatarInitials(author?.fullName || null),
        timestamp: formatTimestamp(post.created_at),
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        audience: post.audience,
        likes: likeCounts.get(post.id) || 0,
        comments: commentCounts.get(post.id) || 0,
        liked: userId != null ? likedPostIds.has(post.id) : undefined,
      };
    });

    return feedPosts;
  } catch (error) {
    console.error("Error in getFeedPosts:", error);
    return [];
  }
}

/**
 * Get a single post by ID in FeedPost shape (for post detail page).
 */
export async function getPostById(
  postId: number,
  currentUserId: number | null = null,
  connectedUserIds: number[] = []
): Promise<FeedPost | null> {
  const { data: row, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !row) return null;

  const post = postRow(row as Record<string, unknown>);
  const connectedSet = new Set(connectedUserIds);
  if (
    !canViewerSeePost(
      post.audience,
      post.authorID,
      currentUserId,
      connectedSet
    )
  ) {
    return null;
  }

  const author = await getUserById(post.authorID);
  if (!author) return null;

  let likeCount = 0;
  let liked = false;
  try {
    const { count } = await supabase
      .from("postlikes")
      .select("*", { count: "exact", head: true })
      .eq("postid", postId);
    likeCount = count ?? 0;
    if (currentUserId != null) {
      const { data: likeRow } = await supabase
        .from("postlikes")
        .select("postid")
        .eq("postid", postId)
        .eq("userid", currentUserId)
        .maybeSingle();
      liked = !!likeRow;
    }
  } catch {
    // postlikes may not exist
  }

  const { count: commentCount } = await supabase
    .from("postcomments")
    .select("*", { count: "exact", head: true })
    .eq("postid", postId);

  return {
    id: post.id,
    author: author.fullName || "Unknown",
    authorId: author.id,
    authorPhotoURL: author.photoURL ?? null,
    major: formatMajor(author.major || null, author.year || null),
    avatar: getAvatarInitials(author.fullName || null),
    timestamp: formatTimestamp(post.created_at),
    title: post.title,
    content: post.content,
    tags: post.tags || [],
    audience: post.audience,
    likes: likeCount,
    comments: commentCount ?? 0,
    liked,
  };
}

/**
 * Get comments for a post with author info.
 */
export async function getCommentsForPost(
  postId: number
): Promise<PostCommentWithAuthor[]> {
  const { data: rows, error } = await supabase
    .from("postcomments")
    .select("*")
    .eq("postid", postId)
    .order("created_at", { ascending: true });

  if (error || !rows?.length) return [];

  const authorIds = [...new Set((rows as Record<string, unknown>[]).map((r) => (r.authorid as number) ?? (r.authorID as number)))];
  const authors = await getUsersByIds(authorIds);

  return (rows as Record<string, unknown>[]).map((r) => {
    const authorId = (r.authorid as number) ?? (r.authorID as number);
    const author = authors.find((u) => u.id === authorId);
    return {
      id: r.id as number,
      authorId,
      authorName: author?.fullName || "Unknown",
      authorPhotoURL: author?.photoURL ?? null,
      content: (r.content as string) ?? "",
      createdAt: (r.created_at as string) ?? "",
    };
  });
}

/**
 * Add a comment to a post. Pass optional sb (e.g. server createClient()) for auth context.
 */
export async function addComment(
  postId: number,
  userId: number,
  content: string,
  sb?: SupabaseClient
): Promise<PostCommentWithAuthor | null> {
  const client = sb ?? supabase;
  const { data, error } = await client
    .from("postcomments")
    .insert({ postid: postId, authorid: userId, content: content.trim() })
    .select()
    .single();

  if (error) {
    console.error("Error adding comment:", error);
    return null;
  }

  const author = await getUserById(userId);
  return {
    id: data.id,
    authorId: userId,
    authorName: author?.fullName || "Unknown",
    authorPhotoURL: author?.photoURL ?? null,
    content: (data.content as string) ?? "",
    createdAt: (data.created_at as string) ?? "",
  };
}

/**
 * Get like count for a post.
 */
export async function getLikeCount(postId: number): Promise<number> {
  try {
    const { count } = await supabase
      .from("postlikes")
      .select("*", { count: "exact", head: true })
      .eq("postid", postId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if the current user has liked the post.
 */
export async function getUserLiked(postId: number, userId: number): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("postlikes")
      .select("postid")
      .eq("postid", postId)
      .eq("userid", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Like or unlike a post. Pass optional sb for auth context.
 * Expects table postlikes (postid, userid).
 */
export async function setLike(
  postId: number,
  userId: number,
  liked: boolean,
  sb?: SupabaseClient
): Promise<{ likeCount: number; liked: boolean }> {
  const client = sb ?? supabase;
  try {
    if (liked) {
      await client.from("postlikes").insert({ postid: postId, userid: userId });
    } else {
      await client
        .from("postlikes")
        .delete()
        .eq("postid", postId)
        .eq("userid", userId);
    }
  } catch (e) {
    if (liked) console.warn("Like may already exist:", e);
    else console.error("Error setting like:", e);
  }
  const likeCount = await getLikeCount(postId);
  const nowLiked = await getUserLiked(postId, userId);
  return { likeCount, liked: nowLiked };
}
