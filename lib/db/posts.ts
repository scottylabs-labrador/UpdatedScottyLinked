import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { NewPost, FeedPost, Post, PostVisibilityScope } from "@/lib/types";
import { getUsersByIds, getUserById } from "./users";
import { isGroupMember, listGroupIdsForUser, getGroupNamesByIds } from "@/lib/db/groups";
import { getConnectedUserIdsAdmin } from "@/lib/db/connections";

export type PostVisibilityRule = {
  scope: PostVisibilityScope;
  groupId: number | null;
};

const postRow = (p: Record<string, unknown>) => {
  const gid = p.group_id ?? p.groupId;
  const groupId =
    gid == null || gid === ""
      ? null
      : typeof gid === "number"
        ? gid
        : Number(gid);
  return {
    id: p.id as number,
    authorID: (p.authorid as number) ?? (p.authorID as number),
    audience: (p.audience as string) ?? "",
    title: (p.title as string) ?? "",
    content: (p.content as string) ?? "",
    tags: (p.tags as string[]) ?? [],
    created_at: (p.created_at as string) ?? "",
    groupId: Number.isFinite(groupId as number) ? (groupId as number) : null,
  };
};

/** Dedupe so unique indexes on post_visibility are not violated. */
function dedupeVisibilityRules(rules: PostVisibilityRule[]): PostVisibilityRule[] {
  const seenNonGroup = new Set<string>();
  const seenGroup = new Set<number>();
  const out: PostVisibilityRule[] = [];
  for (const r of rules) {
    if (r.scope === "group" && r.groupId != null) {
      if (seenGroup.has(r.groupId)) continue;
      seenGroup.add(r.groupId);
      out.push(r);
    } else if (
      r.scope === "public" ||
      r.scope === "connections" ||
      r.scope === "private"
    ) {
      if (seenNonGroup.has(r.scope)) continue;
      seenNonGroup.add(r.scope);
      out.push({ scope: r.scope, groupId: null });
    }
  }
  return out;
}

function normalizeNewPostVisibility(post: NewPost): PostVisibilityRule[] {
  if (post.visibility != null && post.visibility.length > 0) {
    const out: PostVisibilityRule[] = [];
    for (const v of post.visibility) {
      const scope = v.scope;
      if (
        scope !== "public" &&
        scope !== "connections" &&
        scope !== "private" &&
        scope !== "group"
      ) {
        continue;
      }
      if (scope === "group") {
        const gid =
          typeof v.groupId === "number" && Number.isFinite(v.groupId)
            ? v.groupId
            : typeof v.groupId === "string"
              ? parseInt(v.groupId, 10)
              : NaN;
        if (!Number.isFinite(gid)) continue;
        out.push({ scope: "group", groupId: gid });
      } else {
        out.push({ scope, groupId: null });
      }
    }
    return dedupeVisibilityRules(out);
  }
  if (post.groupId != null && Number.isFinite(post.groupId)) {
    return [{ scope: "group", groupId: post.groupId }];
  }
  const a = post.audience;
  if (a === "public" || a === "connections" || a === "private") {
    return [{ scope: a, groupId: null }];
  }
  if (a === "group" && post.groupId != null) {
    return [{ scope: "group", groupId: post.groupId }];
  }
  return dedupeVisibilityRules([{ scope: "public", groupId: null }]);
}

export async function loadVisibilityForPostIds(
  postIds: number[]
): Promise<Map<number, PostVisibilityRule[]>> {
  const map = new Map<number, PostVisibilityRule[]>();
  if (postIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from("post_visibility")
      .select("post_id, scope, group_id")
      .in("post_id", postIds);
    if (error || !data) return map;
    for (const row of data as Record<string, unknown>[]) {
      const pid = row.post_id as number;
      const scope = row.scope as PostVisibilityScope;
      const gid = row.group_id;
      const groupIdRaw =
        gid == null || gid === ""
          ? null
          : typeof gid === "number"
            ? gid
            : Number(gid);
      const groupId =
        scope === "group" && Number.isFinite(groupIdRaw as number)
          ? (groupIdRaw as number)
          : null;
      const list = map.get(pid) ?? [];
      list.push({ scope, groupId });
      map.set(pid, list);
    }
  } catch {
    /* table may not exist before migration */
  }
  return map;
}

function viewerSeesVisibility(
  rules: PostVisibilityRule[],
  ctx: {
    viewerId: number | null;
    authorId: number;
    connectedToAuthor: boolean;
    memberGroupIds: Set<number>;
  }
): boolean {
  if (rules.length === 0) return false;
  for (const r of rules) {
    if (r.scope === "public") return true;
    if (ctx.viewerId == null) continue;
    if (r.scope === "private" && ctx.viewerId === ctx.authorId) return true;
    if (r.scope === "connections") {
      if (ctx.viewerId === ctx.authorId || ctx.connectedToAuthor) return true;
    }
    if (r.scope === "group" && r.groupId != null) {
      if (ctx.memberGroupIds.has(r.groupId)) return true;
    }
  }
  return false;
}

function buildVisibilityFeedMeta(
  rules: PostVisibilityRule[],
  groupNames: Map<number, string>
): { summary: string; groupIds: number[] } {
  const groupIds = [
    ...new Set(
      rules
        .filter((r) => r.scope === "group" && r.groupId != null)
        .map((r) => r.groupId as number)
    ),
  ];
  const parts: string[] = [];
  if (rules.some((r) => r.scope === "public")) parts.push("Everyone");
  if (rules.some((r) => r.scope === "connections")) parts.push("Connections");
  if (rules.some((r) => r.scope === "private")) parts.push("Only you");
  for (const gid of groupIds) {
    parts.push(groupNames.get(gid) ?? `Group ${gid}`);
  }
  return {
    summary: parts.length ? parts.join(" · ") : "Custom",
    groupIds,
  };
}

function canViewerSeePostLegacy(
  audience: string,
  authorId: number,
  viewerId: number | null,
  connectedToViewer: Set<number>
): boolean {
  if (audience === "group") return false;
  if (audience === "public") return true;
  if (viewerId == null) return false;
  if (audience === "private") return authorId === viewerId;
  if (audience === "connections") {
    return authorId === viewerId || connectedToViewer.has(authorId);
  }
  return false;
}

async function insertPostVisibilityRules(
  postId: number,
  rules: PostVisibilityRule[]
): Promise<boolean> {
  if (!supabaseAdmin || rules.length === 0) return false;
  const rows = rules.map((r) => ({
    post_id: postId,
    scope: r.scope,
    group_id: r.scope === "group" ? r.groupId : null,
  }));
  const { error } = await supabaseAdmin.from("post_visibility").insert(rows);
  if (error) {
    console.error("insertPostVisibilityRules:", error);
    return false;
  }
  return true;
}

function denormalizedPostColumns(rules: PostVisibilityRule[]): {
  audience: string;
  group_id: number | null;
} {
  if (rules.length === 1 && rules[0].scope === "group" && rules[0].groupId != null) {
    return { audience: "group", group_id: rules[0].groupId };
  }
  if (rules.length === 1) {
    return { audience: rules[0].scope, group_id: null };
  }
  return { audience: "multi", group_id: null };
}

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
 * Create a new post and visibility rules.
 */
export async function createPost(
  post: NewPost,
  sb?: SupabaseClient
): Promise<Post | null> {
  const client = sb ?? supabase;
  const rules = normalizeNewPostVisibility(post);
  if (rules.length === 0) return null;

  try {
    const title =
      post.title || post.content.substring(0, 50).trim() || "New Post";

    const authorId =
      typeof post.authorId === "string"
        ? parseInt(post.authorId, 10)
        : post.authorId;

    const { audience, group_id } = denormalizedPostColumns(rules);

    const { data, error } = await client
      .from("posts")
      .insert({
        title: title,
        content: post.content,
        authorid: authorId,
        tags: post.tags || [],
        audience,
        group_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return null;
    }

    const postId = (data as { id: number }).id;
    const visOk = await insertPostVisibilityRules(postId, rules);
    if (!visOk) {
      if (supabaseAdmin) {
        await supabaseAdmin.from("posts").delete().eq("id", postId);
      }
      return null;
    }

    return data as Post;
  } catch (error) {
    console.error("Error in createPost:", error);
    return null;
  }
}

type NormalizedPost = ReturnType<typeof postRow>;

export type FeedCursor = { createdAt: string; id: number };

/** Next page in feed order: strictly older than cursor (created_at desc, id desc tie-break). */
function isStrictlyOlderPost(
  post: NormalizedPost,
  cursor: FeedCursor
): boolean {
  if (post.created_at < cursor.createdAt) return true;
  if (post.created_at > cursor.createdAt) return false;
  return post.id < cursor.id;
}

async function hydratePostsToFeedPosts(
  posts: NormalizedPost[],
  userId: number | null,
  connectedSet: Set<number>,
  visMap: Map<number, PostVisibilityRule[]>,
  groupNames: Map<number, string>
): Promise<FeedPost[]> {
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.authorID))];
  const authors = await getUsersByIds(authorIds);

  const ids = posts.map((p) => p.id);
  const { data: commentsData } = await supabase
    .from("postcomments")
    .select("postid")
    .in("postid", ids);

  const commentCounts = new Map<number, number>();
  if (commentsData) {
    (commentsData as Record<string, unknown>[]).forEach((comment) => {
      const postId = (comment.postid as number) ?? (comment.postID as number);
      commentCounts.set(postId, (commentCounts.get(postId) || 0) + 1);
    });
  }

  const likeCounts = new Map<number, number>();
  const likedPostIds = new Set<number>();
  try {
    const { data: likesData } = await supabase
      .from("postlikes")
      .select("postid, userid")
      .in("postid", ids);
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
    /* no postlikes */
  }

  return posts.map((post) => {
    const author = authors.find((user) => user.id === post.authorID);
    const rules = visMap.get(post.id) ?? [];
    const meta =
      rules.length > 0
        ? buildVisibilityFeedMeta(rules, groupNames)
        : {
            summary:
              post.audience === "public"
                ? "Everyone"
                : post.audience === "connections"
                  ? "Connections"
                  : post.audience === "private"
                    ? "Only you"
                    : post.groupId != null
                      ? groupNames.get(post.groupId) ?? `Group ${post.groupId}`
                      : "Everyone",
            groupIds: post.groupId != null ? [post.groupId] : [],
          };
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
      groupId: post.groupId,
      visibilitySummary: meta.summary,
      visibilityGroupIds: meta.groupIds,
      likes: likeCounts.get(post.id) || 0,
      comments: commentCounts.get(post.id) || 0,
      liked: userId != null ? likedPostIds.has(post.id) : undefined,
    };
  });
}

/**
 * Paginated feed: scans posts in created_at desc order until `pageSize` visible posts
 * (or DB exhausted). Pass `cursor` from the previous response's `nextCursor`.
 */
export async function getFeedPostsPaginated(
  userId: number | null = null,
  connectedUserIds: number[] = [],
  pageSize: number = 15,
  hiddenAuthorIds: number[] = [],
  cursor: FeedCursor | null = null
): Promise<{
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
  hasMore: boolean;
}> {
  try {
    const connectedSet = new Set(connectedUserIds);
    const hiddenSet = new Set(hiddenAuthorIds);
    const memberGroupSet = new Set(
      userId != null ? await listGroupIdsForUser(userId) : []
    );

    const collected: NormalizedPost[] = [];
    const seenIds = new Set<number>();
    let dbSkip = 0;
    const BATCH = 200;
    const maxScan = 6000;

    while (collected.length < pageSize && dbSkip < maxScan) {
      const { data: rawPosts, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(dbSkip, dbSkip + BATCH - 1);

      if (error) {
        console.error("Error fetching posts:", error);
        break;
      }

      const chunk = (rawPosts ?? []).map((p) =>
        postRow(p as Record<string, unknown>)
      );
      dbSkip += BATCH;

      if (chunk.length === 0) break;

      const visMapChunk = await loadVisibilityForPostIds(chunk.map((p) => p.id));

      const visible = chunk.filter((p) => {
        if (hiddenSet.has(p.authorID)) return false;
        const rules = visMapChunk.get(p.id) ?? [];
        if (rules.length > 0) {
          return viewerSeesVisibility(rules, {
            viewerId: userId,
            authorId: p.authorID,
            connectedToAuthor: connectedSet.has(p.authorID),
            memberGroupIds: memberGroupSet,
          });
        }
        if (p.groupId != null) {
          if (userId == null) return false;
          return memberGroupSet.has(p.groupId);
        }
        return canViewerSeePostLegacy(
          p.audience,
          p.authorID,
          userId,
          connectedSet
        );
      });

      for (const p of visible) {
        if (cursor != null && !isStrictlyOlderPost(p, cursor)) continue;
        if (seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        collected.push(p);
        if (collected.length >= pageSize) break;
      }

      if (chunk.length < BATCH) break;
    }

    if (collected.length === 0) {
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const visMap = await loadVisibilityForPostIds(collected.map((p) => p.id));
    const allGroupIds = new Set<number>();
    for (const p of collected) {
      const rules = visMap.get(p.id) ?? [];
      for (const r of rules) {
        if (r.scope === "group" && r.groupId != null) allGroupIds.add(r.groupId);
      }
    }
    const groupNames = await getGroupNamesByIds([...allGroupIds]);

    const posts = await hydratePostsToFeedPosts(
      collected,
      userId,
      connectedSet,
      visMap,
      groupNames
    );

    const last = collected[collected.length - 1];
    const nextCursor: FeedCursor = {
      createdAt: last.created_at,
      id: last.id,
    };
    const hasMore = collected.length === pageSize;

    return { posts, nextCursor, hasMore };
  } catch (error) {
    console.error("Error in getFeedPostsPaginated:", error);
    return { posts: [], nextCursor: null, hasMore: false };
  }
}

/**
 * Get posts for feed: union of everything the viewer may see (including group posts).
 */
export async function getFeedPosts(
  userId: number | null = null,
  connectedUserIds: number[] = [],
  limit: number = 50,
  hiddenAuthorIds: number[] = []
): Promise<FeedPost[]> {
  const { posts } = await getFeedPostsPaginated(
    userId,
    connectedUserIds,
    limit,
    hiddenAuthorIds,
    null
  );
  return posts;
}

/**
 * Group discussion: posts with a group visibility rule for this group.
 */
export async function getGroupPosts(
  groupId: number,
  viewerId: number | null,
  limit: number = 50
): Promise<FeedPost[]> {
  if (!supabaseAdmin || viewerId == null) return [];
  const member = await isGroupMember(groupId, viewerId);
  if (!member) return [];

  const { data: visRows, error: vErr } = await supabaseAdmin
    .from("post_visibility")
    .select("post_id")
    .eq("scope", "group")
    .eq("group_id", groupId);

  let postIds: number[] = [];
  if (!vErr && visRows?.length) {
    postIds = [
      ...new Set((visRows as { post_id: number }[]).map((r) => r.post_id)),
    ];
  }

  if (postIds.length === 0) {
    const { data: legacy } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));
    postIds = (legacy as { id: number }[] | null)?.map((r) => r.id) ?? [];
  }

  if (postIds.length === 0) return [];

  const { data: rawPosts, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .in("id", postIds)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error || !rawPosts?.length) return [];

  const posts = (rawPosts as Record<string, unknown>[]).map(postRow);
  const authorIds = [...new Set(posts.map((p) => p.authorID))];
  const authors = await getUsersByIds(authorIds);
  const ids = posts.map((p) => p.id);
  const visMap = await loadVisibilityForPostIds(ids);
  const groupNames = await getGroupNamesByIds([groupId]);

  const { data: commentsData } = await supabaseAdmin
    .from("postcomments")
    .select("postid")
    .in("postid", ids);

  const commentCounts = new Map<number, number>();
  if (commentsData) {
    (commentsData as Record<string, unknown>[]).forEach((comment) => {
      const pid = (comment.postid as number) ?? (comment.postID as number);
      commentCounts.set(pid, (commentCounts.get(pid) || 0) + 1);
    });
  }

  const likeCounts = new Map<number, number>();
  const likedPostIds = new Set<number>();
  try {
    const { data: likesData } = await supabaseAdmin
      .from("postlikes")
      .select("postid, userid")
      .in("postid", ids);
    if (likesData) {
      (likesData as Record<string, unknown>[]).forEach((row) => {
        const postId = (row.postid as number) ?? (row.postID as number);
        likeCounts.set(postId, (likeCounts.get(postId) || 0) + 1);
        if ((row.userid as number) === viewerId) likedPostIds.add(postId);
      });
    }
  } catch {
    /* no postlikes */
  }

  return posts.map((post) => {
    const author = authors.find((user) => user.id === post.authorID);
    const rules = visMap.get(post.id) ?? [];
    const meta =
      rules.length > 0
        ? buildVisibilityFeedMeta(rules, groupNames)
        : {
            summary: groupNames.get(groupId) ?? `Group ${groupId}`,
            groupIds: [groupId],
          };
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
      groupId: post.groupId,
      visibilitySummary: meta.summary,
      visibilityGroupIds: meta.groupIds,
      likes: likeCounts.get(post.id) || 0,
      comments: commentCounts.get(post.id) || 0,
      liked: likedPostIds.has(post.id),
    };
  });
}

/** Whether the viewer may read/interact with a post (comments, likes, detail). */
export async function viewerMayAccessPost(
  postId: number,
  viewerId: number | null
): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("posts")
    .select("authorid, audience, group_id")
    .eq("id", postId)
    .maybeSingle();

  if (error || !row) return false;
  const r = row as Record<string, unknown>;
  const authorId = (r.authorid as number) ?? (r.authorID as number);
  const visMap = await loadVisibilityForPostIds([postId]);
  const rules = visMap.get(postId) ?? [];

  if (rules.length > 0) {
    let connectedToAuthor = false;
    const memberGroupIds = new Set<number>();
    const needsConn = rules.some((x) => x.scope === "connections");
    const needsGroup = rules.some((x) => x.scope === "group");
    if (viewerId != null && needsConn) {
      const peers = await getConnectedUserIdsAdmin(viewerId);
      connectedToAuthor = peers.includes(authorId);
    }
    if (viewerId != null && needsGroup) {
      const g = await listGroupIdsForUser(viewerId);
      g.forEach((id) => memberGroupIds.add(id));
    }
    return viewerSeesVisibility(rules, {
      viewerId,
      authorId,
      connectedToAuthor,
      memberGroupIds,
    });
  }

  const audience = (r.audience as string) ?? "";
  const gidRaw = r.group_id;
  const groupId =
    gidRaw == null
      ? null
      : typeof gidRaw === "number"
        ? gidRaw
        : Number(gidRaw);
  if (Number.isFinite(groupId as number) && (groupId as number) > 0) {
    if (audience === "group" || groupId != null) {
      if (viewerId == null) return false;
      return isGroupMember(groupId as number, viewerId);
    }
  }
  const connectedSet = new Set(
    viewerId != null ? await getConnectedUserIdsAdmin(viewerId) : []
  );
  return canViewerSeePostLegacy(audience, authorId, viewerId, connectedSet);
}

/** @deprecated use viewerMayAccessPost */
export async function viewerMayAccessGroupScopedPost(
  postId: number,
  viewerId: number | null
): Promise<boolean> {
  return viewerMayAccessPost(postId, viewerId);
}

export async function getPostGroupId(postId: number): Promise<number | null> {
  const visMap = await loadVisibilityForPostIds([postId]);
  const rules = visMap.get(postId) ?? [];
  const g = rules.find((r) => r.scope === "group" && r.groupId != null);
  if (g?.groupId != null) return g.groupId;

  const { data, error } = await supabase
    .from("posts")
    .select("group_id")
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const gid = row.group_id;
  if (gid == null) return null;
  return typeof gid === "number" ? gid : Number(gid);
}

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
  const visMap = await loadVisibilityForPostIds([postId]);
  const rules = visMap.get(postId) ?? [];

  if (rules.length > 0) {
    const memberGroupSet = new Set(
      currentUserId != null ? await listGroupIdsForUser(currentUserId) : []
    );
    const connectedSet = new Set(connectedUserIds);
    if (
      !viewerSeesVisibility(rules, {
        viewerId: currentUserId,
        authorId: post.authorID,
        connectedToAuthor: connectedSet.has(post.authorID),
        memberGroupIds: memberGroupSet,
      })
    ) {
      return null;
    }
  } else {
    const connectedSet = new Set(connectedUserIds);
    if (post.groupId != null) {
      if (currentUserId == null) return null;
      const member = await isGroupMember(post.groupId, currentUserId);
      if (!member) return null;
    } else if (
      !canViewerSeePostLegacy(
        post.audience,
        post.authorID,
        currentUserId,
        connectedSet
      )
    ) {
      return null;
    }
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
    /* no postlikes */
  }

  const { count: commentCount } = await supabase
    .from("postcomments")
    .select("*", { count: "exact", head: true })
    .eq("postid", postId);

  const gids = [
    ...new Set(
      rules
        .filter((r) => r.scope === "group" && r.groupId != null)
        .map((r) => r.groupId as number)
    ),
  ];
  const groupNames = await getGroupNamesByIds(gids);

  let meta: { summary: string; groupIds: number[] };
  if (rules.length > 0) {
    meta = buildVisibilityFeedMeta(rules, groupNames);
  } else if (post.groupId != null) {
    const m = await getGroupNamesByIds([post.groupId]);
    meta = {
      summary: m.get(post.groupId) ?? `Group ${post.groupId}`,
      groupIds: [post.groupId],
    };
  } else {
    meta = {
      summary:
        post.audience === "public"
          ? "Everyone"
          : post.audience === "connections"
            ? "Connections"
            : post.audience === "private"
              ? "Only you"
              : "Everyone",
      groupIds: [],
    };
  }

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
    groupId: post.groupId,
    visibilitySummary: meta.summary,
    visibilityGroupIds: meta.groupIds,
    likes: likeCount,
    comments: commentCount ?? 0,
    liked,
  };
}

export async function getCommentsForPost(
  postId: number
): Promise<PostCommentWithAuthor[]> {
  const { data: rows, error } = await supabase
    .from("postcomments")
    .select("*")
    .eq("postid", postId)
    .order("created_at", { ascending: true });

  if (error || !rows?.length) return [];

  const authorIds = [
    ...new Set(
      (rows as Record<string, unknown>[]).map(
        (r) => (r.authorid as number) ?? (r.authorID as number)
      )
    ),
  ];
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
  const [likeCount, nowLiked] = await Promise.all([
    getLikeCount(postId),
    getUserLiked(postId, userId),
  ]);
  return { likeCount, liked: nowLiked };
}
