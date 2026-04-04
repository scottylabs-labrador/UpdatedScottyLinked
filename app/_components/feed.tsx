"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Filter,
  Globe,
  Users,
  Lock,
  Eye,
} from "lucide-react";
import Avatar from "./Avatar";
import type { FeedPost, PostVisibilityScope } from "@/lib/types";
import { createPost } from "@/lib/api/client";

interface FeedProps {
  posts: FeedPost[];
  loading: boolean;
  onPostCreated?: () => void;
  currentUserId?: number | null;
  /** From server bootstrap / home refresh (no client fetch). */
  myGroups: { id: number; name: string }[];
  hasMoreFeed?: boolean;
  loadingMoreFeed?: boolean;
  onLoadMoreFeed?: () => void | Promise<void>;
}

type LikeUpdate = { likes: number; liked: boolean };

export default function Feed({
  posts,
  loading,
  onPostCreated,
  currentUserId = 1,
  myGroups,
  hasMoreFeed = false,
  loadingMoreFeed = false,
  onLoadMoreFeed,
}: FeedProps) {
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");
  const [visPublic, setVisPublic] = useState(true);
  const [visConnections, setVisConnections] = useState(false);
  const [visPrivate, setVisPrivate] = useState(false);
  const [visGroups, setVisGroups] = useState<Record<number, boolean>>({});
  const [feedGroupFilter, setFeedGroupFilter] = useState<number | "all">("all");
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [likeUpdates, setLikeUpdates] = useState<Record<number, LikeUpdate>>({});
  const [likingId, setLikingId] = useState<number | null>(null);
  const [sharedId, setSharedId] = useState<number | null>(null);
  /** Comma-separated tags; post must include every tag (case-insensitive). */
  const [tagFilter, setTagFilter] = useState("");
  /** Search in title and body (case-insensitive). */
  const [textSearch, setTextSearch] = useState("");

  const tagTerms = useMemo(
    () =>
      tagFilter
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    [tagFilter]
  );

  const allTagsInFeed = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      for (const t of p.tags || []) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return [...set].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let list = posts;
    if (tagTerms.length > 0) {
      list = list.filter((p) => {
        const tagsLower = (p.tags || []).map((t) => t.toLowerCase());
        return tagTerms.every((term) =>
          tagsLower.some((tag) => tag === term)
        );
      });
    }
    const q = textSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const title = (p.title || "").toLowerCase();
        const body = (p.content || "").toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }
    return list;
  }, [posts, tagTerms, textSearch]);

  const displayedPosts = useMemo(() => {
    if (feedGroupFilter === "all") return filteredPosts;
    return filteredPosts.filter((p) =>
      p.visibilityGroupIds?.includes(feedGroupFilter)
    );
  }, [filteredPosts, feedGroupFilter]);

  useEffect(() => {
    setVisGroups((prev) => {
      const next = { ...prev };
      for (const g of myGroups) {
        if (next[g.id] === undefined) next[g.id] = false;
      }
      return next;
    });
  }, [myGroups]);

  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el || !hasMoreFeed || loadingMoreFeed || !onLoadMoreFeed) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) void onLoadMoreFeed();
      },
      { root: null, rootMargin: "240px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMoreFeed, loadingMoreFeed, onLoadMoreFeed, posts.length]);

  const getPostLikeState = (post: FeedPost) => {
    const u = likeUpdates[post.id];
    return {
      likes: u?.likes ?? post.likes,
      liked: u?.liked ?? post.liked ?? false,
    };
  };

  const handleLike = async (post: FeedPost) => {
    if (currentUserId == null || likingId != null) return;
    setLikingId(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ liked: !(getPostLikeState(post).liked) }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikeUpdates((prev) => ({
          ...prev,
          [post.id]: { likes: data.likeCount, liked: data.liked },
        }));
      }
    } finally {
      setLikingId(null);
    }
  };

  const handleShare = async (postId: number) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
    try {
      await navigator.clipboard.writeText(url);
      setSharedId(postId);
      setTimeout(() => setSharedId(null), 2000);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handlePost = async () => {
    if (!postContent.trim()) {
      return;
    }

    const visibility: Array<{ scope: PostVisibilityScope; groupId?: number }> =
      [];
    if (visPublic) visibility.push({ scope: "public" });
    if (visConnections) visibility.push({ scope: "connections" });
    if (visPrivate) visibility.push({ scope: "private" });
    for (const g of myGroups) {
      if (visGroups[g.id]) visibility.push({ scope: "group", groupId: g.id });
    }
    if (visibility.length === 0) {
      setVisibilityError("Choose at least one audience.");
      return;
    }
    setVisibilityError(null);

    setIsPosting(true);
    try {
      const tags = postTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const success = await createPost({
        title: postTitle,
        content: postContent,
        tags,
        visibility,
      });

      if (success) {
        setPostTitle("");
        setPostContent("");
        setPostTags("");
        setVisPublic(true);
        setVisConnections(false);
        setVisPrivate(false);
        setVisGroups(() => {
          const next: Record<number, boolean> = {};
          for (const g of myGroups) next[g.id] = false;
          return next;
        });
        if (onPostCreated) {
          onPostCreated();
        }
      }
    } catch (error) {
      console.error("Error posting:", error);
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--muted)] text-sm">
        Loading posts…
      </div>
    );
  }

  const audienceLabel = (a: string) => {
    if (a === "public") return { label: "Public", Icon: Globe };
    if (a === "connections") return { label: "Connections", Icon: Users };
    if (a === "private") return { label: "Only me", Icon: Lock };
    if (a === "group" || a === "multi") return { label: "Audience", Icon: Eye };
    return { label: a, Icon: Eye };
  };

  const visibilityBadge = (post: FeedPost) => {
    if (post.visibilitySummary) {
      return (
        <span
          className="ml-2 badge-muted max-w-[min(280px,55vw)] truncate"
          title={post.visibilitySummary}
        >
          <Eye className="w-3 h-3 shrink-0" />
          {post.visibilitySummary}
        </span>
      );
    }
    if (post.audience) {
      const aud = audienceLabel(post.audience);
      return (
        <span className="ml-2 badge-muted">
          <aud.Icon className="w-3 h-3 shrink-0" />
          {aud.label}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Post composer */}
      {currentUserId != null && (
      <div className="mb-4 card-surface p-4 shadow-sm">
        <div className="space-y-3">
          {/* Title Field */}
          <input
            type="text"
            placeholder="Post Title (optional)"
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 input-surface"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            disabled={isPosting}
          />

          {/* Content Field */}
          <textarea
            placeholder="Share something with the CMU community..."
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 input-surface"
            rows={4}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isPosting}
          />

          <input
            type="text"
            placeholder="Tags (comma-separated, e.g., tech, research)"
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 text-sm input-surface"
            value={postTags}
            onChange={(e) => setPostTags(e.target.value)}
            disabled={isPosting}
          />

          <div>
            <p className="text-xs font-medium text-[var(--muted)] mb-2">
              Who can see this? (any checked audience can view — combined with OR)
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--foreground)]">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visPublic}
                  onChange={(e) => setVisPublic(e.target.checked)}
                  disabled={isPosting}
                  className="rounded border-[var(--border)]"
                />
                Everyone
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visConnections}
                  onChange={(e) => setVisConnections(e.target.checked)}
                  disabled={isPosting}
                  className="rounded border-[var(--border)]"
                />
                Connections
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visPrivate}
                  onChange={(e) => setVisPrivate(e.target.checked)}
                  disabled={isPosting}
                  className="rounded border-[var(--border)]"
                />
                Only me
              </label>
            </div>
            {myGroups.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] mb-2">Your groups</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--foreground)]">
                  {myGroups.map((g) => (
                    <label
                      key={g.id}
                      className="inline-flex items-center gap-2 cursor-pointer max-w-full"
                    >
                      <input
                        type="checkbox"
                        checked={!!visGroups[g.id]}
                        onChange={(e) =>
                          setVisGroups((p) => ({
                            ...p,
                            [g.id]: e.target.checked,
                          }))
                        }
                        disabled={isPosting}
                        className="rounded border-[var(--border)] shrink-0"
                      />
                      <span className="truncate">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {visibilityError && (
              <p className="text-xs text-red-600 mt-2">{visibilityError}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={handlePost}
            disabled={isPosting || !postContent.trim()}
            className="px-5 py-2 min-h-[40px] bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
          >
            {isPosting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
      )}

      {currentUserId != null && posts.length > 0 && myGroups.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted)] shrink-0">
            Show posts:
          </span>
          <button
            type="button"
            onClick={() => setFeedGroupFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
              feedGroupFilter === "all"
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "bg-[var(--pill-inactive-bg)] text-[var(--pill-inactive-text)] border-[var(--border)] hover:bg-[var(--pill-inactive-hover)]"
            }`}
          >
            All
          </button>
          {myGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setFeedGroupFilter(g.id)}
              title={g.name}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition max-w-[10rem] truncate ${
                feedGroupFilter === g.id
                  ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                  : "bg-[var(--pill-inactive-bg)] text-[var(--pill-inactive-text)] border-[var(--border)] hover:bg-[var(--pill-inactive-hover)]"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter / search */}
      {posts.length > 0 && (
        <details className="mb-4 card-surface shadow-sm group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hit-hover)] rounded-[var(--radius-card)] [&::-webkit-details-marker]:hidden">
            <Filter className="w-4 h-4 text-[var(--muted)]" />
            Search and filter posts
            <span className="ml-auto text-xs font-normal text-[var(--muted)] group-open:hidden">
              Tap to expand
            </span>
          </summary>
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Filter by tags
              </label>
              <input
                type="text"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder='e.g. cs — or "cs, ml" for posts with both tags'
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Matches tag names exactly (not case-sensitive). Use commas for
                multiple tags (all must match).
              </p>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                Search in title or content
              </label>
              <input
                type="search"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Search words in posts…"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm input-surface focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
              />
            </div>
          </div>
          {allTagsInFeed.length > 0 && (
            <div>
              <span className="text-xs font-medium text-[var(--muted)] mr-2">
                Quick tags:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {allTagsInFeed.slice(0, 24).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const lower = tag.toLowerCase();
                      const parts = tagFilter
                        .split(",")
                        .map((t) => t.trim().toLowerCase())
                        .filter(Boolean);
                      if (parts.includes(lower)) {
                        setTagFilter(
                          parts.filter((p) => p !== lower).join(", ")
                        );
                      } else {
                        setTagFilter(
                          [...parts, tag].join(", ").replace(/^,\s*/, "")
                        );
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      tagTerms.includes(tag.toLowerCase())
                        ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                        : "bg-[var(--pill-inactive-bg)] text-[var(--pill-inactive-text)] border-[var(--border)] hover:bg-[var(--pill-inactive-hover)]"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(tagFilter.trim() || textSearch.trim() || feedGroupFilter !== "all") && (
            <div className="flex items-center justify-between text-sm text-[var(--muted)]">
              <span>
                Showing {displayedPosts.length} of {posts.length} posts
                {feedGroupFilter !== "all" && " (group filter active)"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTagFilter("");
                  setTextSearch("");
                  setFeedGroupFilter("all");
                }}
                className="text-[var(--brand)] hover:underline font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
          </div>
        </details>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
          No posts yet. Be the first to share something.
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
          <p className="mb-3">No posts match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setTagFilter("");
              setTextSearch("");
              setFeedGroupFilter("all");
            }}
            className="text-[var(--brand)] hover:underline text-sm font-semibold"
          >
            Clear filters
          </button>
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
          <p className="mb-3">No posts in this group on your feed right now.</p>
          <button
            type="button"
            onClick={() => setFeedGroupFilter("all")}
            className="text-[var(--brand)] hover:underline text-sm font-semibold"
          >
            Show all posts
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedPosts.map((post) => {
            const { likes, liked } = getPostLikeState(post);
            return (
              <article
                key={post.id}
                className="card-surface p-4 sm:p-5 shadow-sm hover:border-[var(--brand)]/25 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {post.authorId != null ? (
                    <Link href={`/profile/${post.authorId}`} className="shrink-0">
                      <Avatar
                        text={post.avatar}
                        size="sm"
                        imageUrl={post.authorPhotoURL}
                      />
                    </Link>
                  ) : (
                    <Avatar
                      text={post.avatar}
                      size="sm"
                      imageUrl={post.authorPhotoURL}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        {post.authorId != null ? (
                          <Link
                            href={`/profile/${post.authorId}`}
                            className="font-semibold text-[var(--foreground)] hover:text-[var(--brand)] hover:underline"
                          >
                            {post.author}
                          </Link>
                        ) : (
                          <h3 className="font-semibold text-[var(--foreground)]">
                            {post.author}
                          </h3>
                        )}
                        <p className="text-sm text-[var(--muted)]">{post.major}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-[var(--muted)]">
                          {post.timestamp}
                        </span>
                        {visibilityBadge(post)}
                      </div>
                    </div>
                    <Link
                      href={`/post/${post.id}`}
                      className="block mt-2 hover:opacity-90 transition"
                    >
                      {post.title && (
                        <h4 className="text-lg font-semibold text-[var(--foreground)]">
                          {post.title}
                        </h4>
                      )}
                      <p className="mt-1 text-[var(--foreground)]/90 line-clamp-3">{post.content}</p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {post.tags.slice(0, 4).map((tag, index) => (
                            <span key={index} className="chip-tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1 mt-3 pt-3 border-t border-[var(--border)] text-sm text-[var(--muted)]">
                      <button
                        type="button"
                        onClick={() => handleLike(post)}
                        disabled={currentUserId == null || likingId === post.id}
                        className={`inline-flex items-center gap-1.5 px-2 py-2 rounded-lg min-h-[40px] transition disabled:opacity-50 ${
                          liked
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "hover:bg-[var(--hit-hover)] hover:text-[var(--foreground)]"
                        }`}
                        aria-label={liked ? "Unlike" : "Like"}
                      >
                        <Heart
                          className={`w-4 h-4 ${liked ? "fill-current" : ""}`}
                        />
                        <span>{likes}</span>
                      </button>
                      <Link
                        href={`/post/${post.id}`}
                        className="inline-flex items-center gap-1.5 px-2 py-2 rounded-lg min-h-[40px] hover:bg-[var(--hit-hover)] hover:text-[var(--brand)]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleShare(post.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-2 rounded-lg min-h-[40px] hover:bg-[var(--hit-hover)] hover:text-[var(--brand)]"
                        aria-label="Copy link"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{sharedId === post.id ? "Copied" : "Share"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {hasMoreFeed && (
            <div
              ref={loadMoreSentinelRef}
              className="h-8 flex items-center justify-center text-xs text-[var(--muted)]"
              aria-hidden
            >
              {loadingMoreFeed ? "Loading more…" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
