"use client";

import React, { useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { FeedPost } from "@/lib/types";
import { createPost } from "@/lib/api";

interface FeedProps {
  posts: FeedPost[];
  loading: boolean;
  onPostCreated?: () => void;
  currentUserId?: number | null;
}

type LikeUpdate = { likes: number; liked: boolean };

export default function Feed({
  posts,
  loading,
  onPostCreated,
  currentUserId = 1,
}: FeedProps) {
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");
  const [postVisibility, setPostVisibility] = useState("public");
  const [isPosting, setIsPosting] = useState(false);
  const [likeUpdates, setLikeUpdates] = useState<Record<number, LikeUpdate>>({});
  const [likingId, setLikingId] = useState<number | null>(null);
  const [sharedId, setSharedId] = useState<number | null>(null);

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

    setIsPosting(true);
    try {
      // Parse tags from comma-separated string
      const tags = postTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const success = await createPost(
        postTitle || postContent.substring(0, 50).trim(),
        postContent,
        tags,
        postVisibility
      );

      if (success) {
        setPostTitle("");
        setPostContent("");
        setPostTags("");
        setPostVisibility("public");
        // Refresh posts by calling the callback
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
    return <div className="text-center py-8">Loading posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post Creation Box - only when signed in */}
      {currentUserId != null && (
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="space-y-3">
          {/* Title Field */}
          <input
            type="text"
            placeholder="Post Title (optional)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            disabled={isPosting}
          />

          {/* Content Field */}
          <textarea
            placeholder="Share something with the CMU community..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            rows={4}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            disabled={isPosting}
          />

          {/* Tags and Visibility Row */}
          <div className="flex gap-3">
            {/* Tags Field */}
            <input
              type="text"
              placeholder="Tags (comma-separated, e.g., tech, research)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              disabled={isPosting}
            />

            {/* Visibility Select */}
            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              value={postVisibility}
              onChange={(e) => setPostVisibility(e.target.value)}
              disabled={isPosting}
            >
              <option value="public">🌍 Public</option>
              <option value="connections">👥 Connections</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={handlePost}
            disabled={isPosting || !postContent.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPosting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No posts yet. Be the first to share something!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const { likes, liked } = getPostLikeState(post);
            return (
              <div key={post.id} className="bg-white rounded-lg shadow p-6">
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
                            className="font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                          >
                            {post.author}
                          </Link>
                        ) : (
                          <h3 className="font-semibold text-gray-900">
                            {post.author}
                          </h3>
                        )}
                        <p className="text-sm text-gray-600">{post.major}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">
                          {post.timestamp}
                        </span>
                        {post.audience && (
                          <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {post.audience === "public" && "🌍 Public"}
                            {post.audience === "connections" && "👥 Connections"}
                            {post.audience === "private" && "🔒 Private"}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/post/${post.id}`}
                      className="block mt-2 hover:opacity-90 transition"
                    >
                      {post.title && (
                        <h4 className="text-lg font-semibold text-gray-900">
                          {post.title}
                        </h4>
                      )}
                      <p className="mt-1 text-gray-800 line-clamp-3">{post.content}</p>
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {post.tags.slice(0, 4).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="flex gap-6 mt-4 text-sm text-gray-600">
                      <button
                        type="button"
                        onClick={() => handleLike(post)}
                        disabled={currentUserId == null || likingId === post.id}
                        className={`transition disabled:opacity-50 ${liked ? "text-red-500" : "hover:text-red-500"}`}
                      >
                        {liked ? "❤️" : "🤍"} {likes} {likes === 1 ? "Like" : "Likes"}
                      </button>
                      <Link
                        href={`/post/${post.id}`}
                        className="hover:text-blue-600 transition"
                      >
                        💬 {post.comments} {post.comments === 1 ? "Comment" : "Comments"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleShare(post.id)}
                        className="hover:text-blue-600 transition"
                      >
                        🔗 {sharedId === post.id ? "Copied!" : "Share"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
