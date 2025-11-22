"use client";

import React from 'react';
import Avatar from './Avatar';
import { Post } from '../../types';

interface FeedProps {
  posts: Post[];
  loading: boolean;
}

export default function Feed({ posts, loading }: FeedProps) {
  if (loading) {
    return <div className="text-center py-8">Loading posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post Creation Box */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <textarea
          placeholder="Share something with the CMU community..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="flex justify-end mt-3">
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Post
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
          {posts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-3">
                <Avatar text={post.avatar} size="sm" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{post.author}</h3>
                      <p className="text-sm text-gray-600">{post.major}</p>
                    </div>
                    <span className="text-sm text-gray-500">{post.timestamp}</span>
                  </div>
                  <p className="mt-3 text-gray-800">{post.content}</p>
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