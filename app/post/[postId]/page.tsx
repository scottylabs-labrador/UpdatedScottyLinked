"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import ReportModal from "@/app/_components/ReportModal";
import { AppPageContainer } from "@/app/_components/AppShell";
import { Heart, MessageCircle } from "lucide-react";
import type { FeedPost } from "@/lib/types";
import type { PostCommentWithAuthor } from "@/lib/db/posts";

function formatCommentTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function PostPage() {
  const params = useParams();
  const postId = params.postId as string;
  const id = parseInt(postId, 10);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const loadPost = useCallback(async () => {
    if (isNaN(id)) return;
    const res = await fetch(`/api/posts/${id}`, { credentials: "include" });
    if (!res.ok) {
      setError(res.status === 404 ? "Post not found" : "Failed to load");
      setPost(null);
      return;
    }
    const data = await res.json();
    setPost(data);
    setError(null);
  }, [id]);

  const loadComments = useCallback(async () => {
    if (isNaN(id)) return;
    const res = await fetch(`/api/posts/${id}/comments`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  }, [id]);

  useEffect(() => {
    if (!postId || isNaN(id)) {
      setError("Invalid post");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadPost(), loadComments()]).finally(() => setLoading(false));
  }, [postId, id, loadPost, loadComments]);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.appUser?.id ?? null));
  }, []);

  const handleLike = async () => {
    if (liking || currentUserId == null || !post) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/posts/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ liked: !post.liked }),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((p) => (p ? { ...p, likes: data.likeCount, liked: data.liked } : null));
      }
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment || currentUserId == null) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setCommentText("");
        setPost((p) => (p ? { ...p, comments: p.comments + 1 } : null));
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <AppPageContainer maxWidthClass="max-w-5xl">
        <div className="flex items-center justify-center min-h-[50vh] text-[var(--muted)] text-sm">
          Loading post…
        </div>
      </AppPageContainer>
    );
  }

  if (error || !post) {
    return (
      <AppPageContainer maxWidthClass="max-w-lg">
        <div className="card-surface p-8 text-center shadow-sm">
          <p className="text-[var(--foreground)]">{error ?? "Post not found"}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-[var(--brand)] font-medium hover:underline"
          >
            Back to feed
          </Link>
        </div>
      </AppPageContainer>
    );
  }

  return (
    <>
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={id}
      />
      <AppPageContainer maxWidthClass="max-w-5xl">
        <div className="card-surface overflow-hidden flex flex-col md:flex-row min-h-[min(480px,70vh)] shadow-sm">
          {/* Left: Post */}
          <div className="md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-[var(--border)]">
            <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
              {post.authorId != null ? (
                <Link href={`/profile/${post.authorId}`} className="shrink-0">
                  <Avatar text={post.avatar} size="sm" imageUrl={post.authorPhotoURL} />
                </Link>
              ) : (
                <Avatar text={post.avatar} size="sm" imageUrl={post.authorPhotoURL} />
              )}
              <div className="min-w-0 flex-1">
                {post.authorId != null ? (
                  <Link
                    href={`/profile/${post.authorId}`}
                    className="font-semibold text-[var(--foreground)] hover:text-[var(--brand)] hover:underline"
                  >
                    {post.author}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--foreground)]">{post.author}</span>
                )}
                <p className="text-xs text-[var(--muted)] truncate">{post.major} · {post.timestamp}</p>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {post.title && (
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">{post.title}</h2>
              )}
              <p className="text-[var(--foreground)]/90 whitespace-pre-wrap">{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="chip-tag"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 pt-0 flex flex-wrap gap-3 text-sm border-t border-[var(--border)] items-center">
              <button
                type="button"
                onClick={handleLike}
                disabled={currentUserId == null || liking}
                className={`inline-flex items-center gap-2 min-h-[40px] px-2 rounded-lg transition disabled:opacity-50 ${
                  post.liked ? "text-red-600 dark:text-red-400" : "text-[var(--foreground)] hover:bg-[var(--hit-hover)]"
                }`}
                aria-label="Like"
              >
                <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                <span>
                  {post.likes} {post.likes === 1 ? "like" : "likes"}
                </span>
              </button>
              <span className="text-[var(--muted)] inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {post.comments} {post.comments === 1 ? "comment" : "comments"}
              </span>
              {currentUserId != null &&
                post.authorId != null &&
                currentUserId !== post.authorId && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="text-red-700 hover:underline ml-auto sm:ml-0 text-sm font-medium"
                  >
                    Report post
                  </button>
                )}
            </div>
          </div>

          {/* Right: Comments */}
          <div className="md:w-1/2 flex flex-col bg-[var(--comment-pane-bg)] md:bg-transparent">
            <div className="p-3 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--foreground)]">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] p-3 space-y-4">
              {comments.length === 0 ? (
                <p className="text-[var(--muted)] text-sm py-4">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Link
                      href={`/profile/${c.authorId}`}
                      className="shrink-0"
                    >
                      <Avatar
                        text={c.authorName.slice(0, 2).toUpperCase()}
                        size="sm"
                        imageUrl={c.authorPhotoURL}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <Link
                          href={`/profile/${c.authorId}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--brand)] hover:underline text-sm"
                        >
                          {c.authorName}
                        </Link>
                        <span className="text-xs text-[var(--muted)]">
                          {formatCommentTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-[var(--foreground)]/90 text-sm mt-0.5 break-words">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {currentUserId != null && (
              <form onSubmit={handleAddComment} className="p-3 border-t border-[var(--border)] bg-[var(--surface)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={submittingComment}
                    className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 input-surface"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="px-4 py-2 min-h-[40px] bg-[var(--brand)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? "Posting…" : "Post"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </AppPageContainer>
    </>
  );
}
