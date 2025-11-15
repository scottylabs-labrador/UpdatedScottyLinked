"use client";

<<<<<<< HEAD
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
=======
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "../147268137.png";

export default function Navbar() {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function onDoc(e: MouseEvent) {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}

		document.addEventListener("click", onDoc);
		return () => document.removeEventListener("click", onDoc);
	}, []);

	return (
		<nav style={{ display: "flex", alignItems: "center", padding: "12px 20px", position: "relative" }}>
			<Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
				<Image src={logo} alt="Logo" width={40} height={40} />
				<span style={{ marginLeft: 10, fontWeight: 600 }}>ScottyLinked</span>
			</Link>

			<div style={{ marginLeft: "auto", position: "relative" }} ref={wrapRef}>
				<button
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-controls="nav-menu"
					style={{
						background: "transparent",
						border: "1px solid #e5e7eb",
						padding: "8px 12px",
						borderRadius: 8,
						cursor: "pointer",
					}}
				>
					Menu ▾
				</button>

				{open && (
					<div
						id="nav-menu"
						role="menu"
						style={{
							position: "absolute",
							right: 0,
							top: "calc(100% + 8px)",
							background: "#fff",
							border: "1px solid #e5e7eb",
							borderRadius: 8,
							boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
							minWidth: 160,
							zIndex: 1000,
							overflow: "hidden",
						}}
					>
						<Link
							href="/research"
							role="menuitem"
							onClick={() => setOpen(false)}
							style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "#111" }}
						>
							Research
						</Link>
						<Link
							href="/projects"
							role="menuitem"
							onClick={() => setOpen(false)}
							style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "#111" }}
						>
							Projects
						</Link>
					</div>
				)}
			</div>
		</nav>
	);
}
>>>>>>> 1afaffd31c329ab97246656c83aa5b85e3b2ec66
