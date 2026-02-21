import { supabase } from "@/lib/supabaseClient";
import { NewPost, FeedPost, Post } from "@/lib/types";
import { getUsersByIds } from "./users";

/**
 * Create a new post in the database
 */
export async function createPost(post: NewPost): Promise<Post | null> {
  try {
    // Generate a title from content if not provided
    const title =
      post.title || post.content.substring(0, 50).trim() || "New Post";

    const authorId =
      typeof post.authorId === "string"
        ? parseInt(post.authorId, 10)
        : post.authorId;
    const { data, error } = await supabase
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

/**
 * Get posts for feed with user information
 * Fetches posts visible to the user and transforms them to FeedPost format
 */
export async function getFeedPosts(
  userId: number | null = null,
  limit: number = 50
): Promise<FeedPost[]> {
  try {
    // Get all public posts, or posts from connections if userId is provided
    let query = supabase.from("posts").select("*");

    // For now, just get public posts (connections require admin access)
    query = query.eq("audience", "public");

    const { data: posts, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching posts:", error);
      return [];
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    const postRow = (p: Record<string, unknown>) => ({
      id: p.id as number,
      authorID: (p.authorid as number) ?? (p.authorID as number),
      audience: (p.audience as string) ?? "",
      title: (p.title as string) ?? "",
      content: (p.content as string) ?? "",
      tags: (p.tags as string[]) ?? [],
      created_at: (p.created_at as string) ?? "",
    });

    // Get all unique author IDs (DB column may be authorid)
    const authorIds = [...new Set(posts.map((p) => postRow(p as Record<string, unknown>).authorID))];
    const authors = await getUsersByIds(authorIds);

    // Get comment counts for each post (DB table may be postcomments, column postid)
    const postIds = posts.map((p) => (p as Record<string, unknown>).id as number);
    const { data: commentsData } = await supabase
      .from("postcomments")
      .select("postid")
      .in("postid", postIds);

    const commentCounts = new Map<number, number>();
    if (commentsData) {
      (commentsData as Record<string, unknown>[]).forEach((comment) => {
        const postId = (comment.postid as number) ?? (comment.postID as number);
        commentCounts.set(
          postId,
          (commentCounts.get(postId) || 0) + 1
        );
      });
    }

    // Transform posts to FeedPost format
    const feedPosts: FeedPost[] = posts.map((p) => {
      const post = postRow(p as Record<string, unknown>);
      const author = authors.find((user) => user.id === post.authorID);
      const comments = commentCounts.get(post.id) || 0;

      // Generate avatar initials from fullName
      const getAvatarInitials = (name: string | null): string => {
        if (!name) return "?";
        const parts = name.split(" ");
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
      };

      // Format timestamp
      const formatTimestamp = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
          return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
        } else if (diffHours < 24) {
          return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        } else if (diffDays < 7) {
          return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        } else {
          return date.toLocaleDateString();
        }
      };

      // Format major and year
      const formatMajor = (
        major: string | null,
        year: string | null
      ): string => {
        if (!major && !year) return "";
        if (major && year) return `${major} '${year.slice(-2)}`;
        if (major) return major;
        return `Class of ${year}`;
      };

      return {
        id: post.id,
        author: author?.fullName || "Unknown",
        major: formatMajor(author?.major || null, author?.year || null),
        avatar: getAvatarInitials(author?.fullName || null),
        timestamp: formatTimestamp(post.created_at),
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        audience: post.audience,
        likes: 0, // Likes not in schema, set to 0 for now
        comments: comments,
      };
    });

    return feedPosts;
  } catch (error) {
    console.error("Error in getFeedPosts:", error);
    return [];
  }
}
