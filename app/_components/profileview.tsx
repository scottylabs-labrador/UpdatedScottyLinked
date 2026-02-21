"use client";

import React, { useState } from "react";
import Avatar from "./Avatar";
import { UserProfile } from "@/lib/types";

interface ProfileViewProps {
  user: UserProfile | null;
  loading: boolean;
  onProfileUpdated?: () => void;
}

export default function ProfileView({
  user,
  loading,
  onProfileUpdated,
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    major: "",
    year: "",
    bio: "",
  });

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Sign in to view your profile.
      </div>
    );
  }

  const startEditing = () => {
    setForm({
      name: user.name,
      major: user.major,
      year: user.year,
      bio: user.bio ?? "",
    });
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.name.trim() || undefined,
          major: form.major.trim() || null,
          year: form.year.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed");
      }
      setEditing(false);
      onProfileUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700" />

        <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-6">
              <Avatar text={user.avatar} size="lg" imageUrl={user.photoURL} />
            <div className="flex-1 pt-14">
              {editing ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user.name}
                  </h2>
                  <p className="text-gray-600">
                    {user.major} • {user.year}
                  </p>
                </>
              )}
            </div>
            {editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          {editing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Major
                </label>
                <input
                  type="text"
                  value={form.major}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, major: e.target.value }))
                  }
                  placeholder="e.g. Computer Science"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                  placeholder="e.g. 2026"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  rows={4}
                  placeholder="A short bio..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Contact
                </h3>
                <p className="text-gray-800">{user.email}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  About
                </h3>
                <p className="text-gray-800">
                  {user.bio || "No bio yet."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Academic Info
                </h3>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Year</p>
                    <p className="font-semibold text-gray-900">{user.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">GPA</p>
                    <p className="font-semibold text-gray-900">{user.gpa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Connections</p>
                    <p className="font-semibold text-gray-900">
                      {user.connections}
                    </p>
                  </div>
                </div>
              </div>

              {user.skills && user.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}