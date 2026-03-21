"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/app/_components/Avatar";
import AppNavbar from "@/app/_components/AppNavbar";
import ReportModal from "@/app/_components/ReportModal";
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
      <div className="min-h-screen bg-gray-50">
        <AppNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar />
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <p className="text-gray-600">{error ?? "Post not found"}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={id}
      />
      <AppNavbar />
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[480px]">
          {/* Left: Post */}
          <div className="md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-gray-200">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
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
                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                  >
                    {post.author}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">{post.author}</span>
                )}
                <p className="text-xs text-gray-500 truncate">{post.major} · {post.timestamp}</p>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {post.title && (
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h2>
              )}
              <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 pt-0 flex flex-wrap gap-4 text-sm border-t border-gray-100 items-center">
              <button
                type="button"
                onClick={handleLike}
                disabled={currentUserId == null || liking}
                className="flex items-center gap-1.5 text-gray-700 hover:text-red-500 disabled:opacity-50 transition"
              >
                <span className="text-lg">{post.liked ? "❤️" : "🤍"}</span>
                <span>{post.likes} {post.likes === 1 ? "like" : "likes"}</span>
              </button>
              <span className="text-gray-500 flex items-center gap-1.5">
                <span className="text-lg">💬</span>
                {post.comments} {post.comments === 1 ? "comment" : "comments"}
              </span>
              {currentUserId != null &&
                post.authorId != null &&
                currentUserId !== post.authorId && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="text-red-700 hover:underline ml-auto sm:ml-0"
                  >
                    Report post
                  </button>
                )}
            </div>
          </div>

          {/* Right: Comments */}
          <div className="md:w-1/2 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] p-3 space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No comments yet. Be the first!</p>
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
                          className="font-semibold text-gray-900 hover:text-blue-600 hover:underline text-sm"
                        >
                          {c.authorName}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {formatCommentTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-800 text-sm mt-0.5 break-words">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {currentUserId != null && (
              <form onSubmit={handleAddComment} className="p-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={submittingComment}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
