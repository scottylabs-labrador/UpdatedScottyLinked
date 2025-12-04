"use client";

import React from 'react';
import Avatar from './Avatar';
import { UserProfile } from '@/lib/types';

interface ProfileViewProps {
  user: UserProfile | null;
  loading: boolean;
}

export default function ProfileView({ user, loading }: ProfileViewProps) {
  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }
  
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Unable to load profile. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700"></div>
        
        <div className="px-6 pb-6">
          {/* Profile Header */}
          <div className="flex items-end gap-4 -mt-12 mb-6">
            <Avatar text={user.avatar} size="lg" />
            <div className="flex-1 pt-14">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.major} • {user.year}</p>
            </div>
            <button className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold">
              Edit Profile
            </button>
          </div>

          {/* Profile Sections */}
          <div className="space-y-6">
            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Contact</h3>
              <p className="text-gray-800">{user.email}</p>
            </div>

            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">About</h3>
              <p className="text-gray-800">{user.bio}</p>
            </div>

            {/* Academic Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Academic Info</h3>
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
                  <p className="font-semibold text-gray-900">{user.connections}</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}