"use client";

import React from "react";
import Image from "next/image";
import logo from "../147268137.png";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const NavButton = ({ label, tab }: { label: string; tab: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-semibold transition-all text-sm ${
        activeTab === tab
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <span>{label}</span>
    </button>
  );

  return (
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
  );
}