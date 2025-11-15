"use client";

<<<<<<< HEAD
import React, { useState } from "react";
import Navbar from "./_components/navbar";
import Image from "next/image";
import logo from "./147268137.png";
import Link from "next/link";
import { posts } from "./data";
=======
import React from "react";
import Image from "next/image";
import logo from "./147268137.png";
>>>>>>> 1afaffd31c329ab97246656c83aa5b85e3b2ec66

interface LandingPageProps {
  username?: string;
}


const PostFeed: React.FC<{ activeTab: "research" | "jobs" | "projects" }> = ({
  activeTab,
}) => {
  const feed = posts[activeTab] || [];

  return (
    <div className="w-full max-w-2xl mt-10 space-y-6">
      {feed.length === 0 && (
        <p className="text-center text-gray-500">No posts available.</p>
      )}

     {feed.map((post) => (
      <Link key={post.id} href={`/post/${post.id}`}>
        <div
          className="bg-white cursor-pointer shadow-sm rounded-xl p-6 border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-blue-600">
              {post.author}
            </span>
            <span className="text-sm text-gray-400">{post.timestamp}</span>
          </div>

          <h3 className="text-lg font-bold text-gray-800">{post.title}</h3>
          <p className="text-gray-600 mt-2">{post.content}</p>
        </div>
      </Link>
    ))}

    </div>
  );
};



const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  return (
<<<<<<< HEAD
    <div>
      <Navbar/>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        {/* Header / Logo */}
        <header className="flex flex-col items-center space-y-4 mb-12">
          <Image
            src={logo}
            alt="ScottyLinked Logo"
            width={96}
            height={96}
            className="rounded-full shadow-md object-cover"
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
        <PostFeed activeTab={activeTab} />
=======
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 p-6">
      {/* Header / Logo */}
      <header className="flex flex-col items-center space-y-4 mb-12">
        <Image
          src={logo}
          alt="ScottyLinked Logo"
          width={96}
          height={96}
          className="w-24 h-24 rounded-full shadow-md object-cover"
        />
        <h1 className="text-4xl font-bold text-gray-800">ScottyLinked</h1>
        <p className="text-lg text-gray-600">
          Welcome, <span className="font-semibold text-blue-600">{username}</span>!
        </p>
      </header>

      <div className="mt-10 text-center text-gray-700 max-w-xl">
        <p className="mb-4">Use the Menu in the top-right to navigate to Research or Projects.</p>
>>>>>>> 1afaffd31c329ab97246656c83aa5b85e3b2ec66
      </div>
    </div>
  );
};

export default LandingPage;
