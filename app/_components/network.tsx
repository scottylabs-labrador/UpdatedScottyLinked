"use client";

import React, { useState } from "react";
import Avatar from "./Avatar";
import { Profile } from "@/lib/types";
import { createConnection } from "@/lib/api";

interface NetworkProps {
  profiles: Profile[];
  loading: boolean;
  connectedIds: number[]; // <-- add this
  onConnectionCreated?: () => void;
}

const CURRENT_USER_ID = 1; // User is signed in as ID 1

export default function Network({
  profiles,
  loading,
  connectedIds = [],
  onConnectionCreated,
}: NetworkProps) {
  const [connectingUsers, setConnectingUsers] = useState<Set<number>>(
    new Set()
  );
  // Split profiles
  const connectedProfiles = profiles.filter((profile) =>
    connectedIds.includes(profile.id)
  );
  const notConnectedProfiles = profiles.filter(
    (profile) => !connectedIds.includes(profile.id)
  );

  const handleConnect = async (targetUserId: number) => {
    if (connectingUsers.has(targetUserId)) {
      return; // Already connecting
    }

    setConnectingUsers((prev) => new Set(prev).add(targetUserId));
    try {
      const success = await createConnection(CURRENT_USER_ID, targetUserId);
      if (success && onConnectionCreated) {
        onConnectionCreated();
      }
    } catch (error) {
      console.error("Error creating connection:", error);
    } finally {
      setConnectingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading profiles...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search students by name, major, or skills..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
      </div>
      {/* Connected Users */}
      <h2 className="text-lg font-semibold mb-2 text-black">
        Your Connections
      </h2>
      {connectedProfiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 mb-6">
          No connections yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {connectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <Avatar text={profile.avatar} size="md" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {profile.name}
                  </h3>
                  <p className="text-gray-600">{profile.major}</p>
                  <p className="text-sm text-gray-500">{profile.year}</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-4">{profile.bio}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills
                  .slice(0, 3)
                  .map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600 ">
                  {profile.connections} connections
                </span>
                {/* No connect button for already connected */}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* New People Section */}
      <h2 className="text-lg font-semibold mb-2 text-black">
        Discover New People
      </h2>
      {notConnectedProfiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No new people to discover right now.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {notConnectedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <Avatar text={profile.avatar} size="md" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {profile.name}
                  </h3>
                  <p className="text-gray-600">{profile.major}</p>
                  <p className="text-sm text-gray-500">{profile.year}</p>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-4">{profile.bio}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills
                  .slice(0, 3)
                  .map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {profile.connections} connections
                </span>
                <button
                  onClick={() => handleConnect(profile.id)}
                  disabled={connectingUsers.has(profile.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectingUsers.has(profile.id)
                    ? "Connecting..."
                    : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
