"use client";

import React from "react";
import Image from "next/image";
import logo from "./147268137.png";

interface LandingPageProps {
  username?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ username = "Username" }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
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
      </div>
    </div>
  );
};

export default LandingPage;
