"use client";

import React, { useState } from "react";

interface LandingPageProps {
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  const [activeTab, setActiveTab] = useState<"research" | "jobs" | "projects">("research");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* Header / Logo */}
      <header className="flex flex-col items-center space-y-4 mb-12">
        <img
          src="/logo.png" // <-- replace with actual logo path
          alt="ScottyLinked Logo"
          className="w-24 h-24 rounded-full shadow-md object-cover"
        />
        <h1 className="text-4xl font-bold text-gray-800">ScottyLinked</h1>
        <p className="text-lg text-gray-600">
          Welcome, <span className="font-semibold text-blue-600">{username}</span>!
        </p>
      </header>

      {/* Tabs */}
      <div className="flex space-x-8 border-b border-gray-200 pb-2">
        {["research", "jobs", "projects"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "research" | "jobs" | "projects")}
            className={`capitalize text-lg font-medium pb-2 border-b-4 transition-all duration-200 ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-10 text-center text-gray-700">
        {activeTab === "research" && <p>Explore current research opportunities and collaborations.</p>}
        {activeTab === "jobs" && <p>Find and apply to job openings tailored for your interests.</p>}
        {activeTab === "projects" && <p>Showcase your projects or join others to build something great.</p>}
      </div>
    </div>
  );
};

export default LandingPage;
