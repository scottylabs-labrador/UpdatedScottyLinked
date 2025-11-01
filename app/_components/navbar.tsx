"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "../147268137.png";

type NavItem = {
  label: string;
  href: string;
};

const Navbar: React.FC = () => {
  const navItems: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "Profile", href: "/profile" },
    { label: "Connections", href: "/connections" },
    { label: "New Post", href: "/new-post" },
  ];

  const [active, setActive] = useState<string>("Home");

  return (
    <nav className="w-full bg-white shadow-md px-8 py-4 flex justify-between items-center">
      {/* Logo / Site Name */}
      <div className="flex items-center space-x-2">
        <Image
          src={logo}
          alt="ScottyLinked Logo"
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
        <h1 className="text-xl font-semibold text-gray-800">ScottyLinked</h1>
      </div>

      {/* Nav Links */}
      <div className="flex space-x-8">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setActive(item.label)}
            className={`text-base font-medium transition-colors duration-200 ${
              active === item.label
                ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
