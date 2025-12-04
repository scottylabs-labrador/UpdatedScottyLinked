"use client";

import React, { useState } from "react";
import Avatar from "./Avatar";
import { FeedPost } from "@/lib/types";
import { createPost } from "@/lib/api";

interface FeedProps {
  posts: FeedPost[];
  loading: boolean;
  onPostCreated?: () => void;
}

const CURRENT_USER_ID = 1; // User is signed in as ID 1

export default function Feed({ posts, loading, onPostCreated }: FeedProps) {
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState("");
  const [postVisibility, setPostVisibility] = useState("public");
  const [isPosting, setIsPosting] = useState(false);

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
        postVisibility,
        CURRENT_USER_ID
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
      {/* Post Creation Box */}
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

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No posts yet. Be the first to share something!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3">
                <Avatar text={post.avatar} size="sm" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {post.author}
                      </h3>
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
                  {post.title && (
                    <h4 className="mt-3 text-lg font-semibold text-gray-900">
                      {post.title}
                    </h4>
                  )}
                  <p className="mt-3 text-gray-800">{post.content}</p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {post.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-6 mt-4 text-sm text-gray-600">
                    <button className="hover:text-blue-600 transition">
                      ❤️ {post.likes} Likes
                    </button>
                    <button className="hover:text-blue-600 transition">
                      💬 {post.comments} Comments
                    </button>
                    <button className="hover:text-blue-600 transition">
                      🔗 Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
