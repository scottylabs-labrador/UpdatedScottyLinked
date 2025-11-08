"use client";

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
