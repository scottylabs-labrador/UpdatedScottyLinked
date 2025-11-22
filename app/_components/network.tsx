"use client";

import React from 'react';
import Avatar from './Avatar';
import { Profile } from '../../types';

interface NetworkProps {
  profiles: Profile[];
  loading: boolean;
}

export default function Network({ profiles, loading }: NetworkProps) {
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No student profiles to display yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {profiles.map(profile => (
            <div key={profile.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex items-start gap-4 mb-4">
                <Avatar text={profile.avatar} size="md" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{profile.name}</h3>
                  <p className="text-gray-600">{profile.major}</p>
                  <p className="text-sm text-gray-500">{profile.year}</p>
                </div>
              </div>

              <p className="text-gray-700 text-sm mb-4">{profile.bio}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills.slice(0, 3).map((skill: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {profile.connections} connections
                </span>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}