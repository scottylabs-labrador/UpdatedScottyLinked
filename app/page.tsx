"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import logo from "./147268137.png";
import Feed from "./_components/feed";
import Opportunities from "./_components/opportunities";
import Network from "./_components/network";
import ProfileView from "./_components/profileview";
import { FeedPost, Opportunity, Profile, UserProfile } from "@/lib/types";
import {
  fetchPosts,
  fetchOpportunities,
  fetchProfiles,
  fetchCurrentUser,
} from "@/lib/api";
import { getConnectedUserIds } from "@/lib/db/connections";

interface LandingPageProps {
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  const [activeTab, setActiveTab] = useState<
    "feed" | "opportunities" | "network" | "profile"
  >("feed");

  // Data state
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState<number[]>([]); // Add this line

  // Fetch data function
  const loadData = async () => {
    setLoading(true);
    try {
      const [postsData, opportunitiesData, profilesData, userData, connected] =
        await Promise.all([
          fetchPosts(1),
          fetchOpportunities(),
          fetchProfiles(1),
          fetchCurrentUser(1),
          getConnectedUserIds(1, true), // Fetch connected user IDs
        ]);
      setPosts(postsData);
      setOpportunities(opportunitiesData);
      setProfiles(profilesData);
      setUserProfile(userData);
      setConnectedIds(connected); // Update state
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const NavButton = ({
    label,
    tab,
  }: {
    label: string;
    tab: "feed" | "opportunities" | "network" | "profile";
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-semibold transition-all text-sm ${
        activeTab === tab
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src={logo}
                alt="ScottyLinked Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
              <span className="text-xl font-bold text-gray-900">
                ScottyLinked
              </span>
            </div>

            <nav className="flex gap-1">
              <NavButton label="Feed" tab="feed" />
              <NavButton label="Opportunities" tab="opportunities" />
              <NavButton label="Network" tab="network" />
              <NavButton label="Profile" tab="profile" />
            </nav>
          </div>
        </div>
      </header>

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-6 p-6">
        {/* Tab Content */}
        {activeTab === "feed" && (
          <Feed posts={posts} loading={loading} onPostCreated={loadData} />
        )}
        {activeTab === "opportunities" && (
          <Opportunities opportunities={opportunities} loading={loading} />
        )}
        {activeTab === "network" && (
          <Network
            profiles={profiles}
            loading={loading}
            connectedIds={connectedIds}
            onConnectionCreated={loadData}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView user={userProfile} loading={loading} />
        )}
      </div>
    </>
  );
};

export default LandingPage;
