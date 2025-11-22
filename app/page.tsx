"use client";

import React, { useState } from "react";
import Image from "next/image";
import logo from "./147268137.png";
import Feed from "./_components/feed";
import Opportunities from "./_components/opportunities";
import Network from "./_components/network";
import ProfileView from "./_components/profileview";
import { Post, Opportunity, Profile, UserProfile } from "../types";

interface LandingPageProps {
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  const [activeTab, setActiveTab] = useState<
    "feed" | "opportunities" | "network" | "profile"
  >("feed");

  // Sample data
  const samplePosts: Post[] = [
    {
      id: 1,
      author: "Sarah Chen",
      major: "Computer Science '25",
      avatar: "SC",
      timestamp: "2 hours ago",
      content: "Just finished an amazing project on machine learning! Looking for collaborators for a startup idea. DM me if interested! 🚀",
      likes: 24,
      comments: 8
    }
  ];

  const sampleOpportunities: Opportunity[] = [
    {
      id: 1,
      title: "Software Engineering Intern",
      company: "Meta",
      type: "Internship",
      location: "Menlo Park, CA",
      posted: "2 days ago",
      skills: ["React", "Python", "AWS"],
      description: "Join our infrastructure team working on cutting-edge distributed systems."
    }
  ];

  const sampleProfiles: Profile[] = [
    {
      id: 1,
      name: "Emily Rodriguez",
      avatar: "ER",
      major: "Business Administration",
      year: "Junior",
      skills: ["Marketing", "Data Analysis", "Public Speaking"],
      bio: "Passionate about tech entrepreneurship and social impact.",
      connections: 234
    }
  ];

  const sampleUserProfile: UserProfile = {
    name: "Alex Johnson",
    avatar: "AJ",
    major: "Computer Science",
    year: "Sophomore",
    email: "ajohnson@andrew.cmu.edu",
    skills: ["JavaScript", "Python", "React", "Node.js", "Machine Learning"],
    bio: "Full-stack developer interested in AI and web technologies.",
    connections: 156,
    gpa: "3.8"
  };

  const NavButton = ({ label, tab }: { label: string; tab: "feed" | "opportunities" | "network" | "profile" }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-semibold transition-all text-sm ${
        activeTab === tab
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900'
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
              <span className="text-xl font-bold text-gray-900">ScottyLinked</span>
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
        {activeTab === "feed" && <Feed posts={samplePosts} loading={false} />}
        {activeTab === "opportunities" && <Opportunities opportunities={sampleOpportunities} loading={false} />}
        {activeTab === "network" && <Network profiles={sampleProfiles} loading={false} />}
        {activeTab === "profile" && <ProfileView user={sampleUserProfile} loading={false} />}
      </div>
    </>
  );
};

export default LandingPage;
