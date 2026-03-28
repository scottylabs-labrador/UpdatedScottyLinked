"use client";

import React from "react";
import Avatar from "./Avatar";
import { UserProfile } from "@/lib/types";
import {
  Github,
  Linkedin,
  Link as LinkIcon,
  FileText,
  GraduationCap,
} from "lucide-react";

type ProfileHeaderProps = {
  user: UserProfile;
  /** Extra content to the right of the name block (e.g. Connect / Edit) */
  actionSlot?: React.ReactNode;
};

function headline(user: UserProfile): string {
  const parts: string[] = [];
  if (user.degree && user.degree.trim()) parts.push(user.degree.trim());
  if (user.major && user.major !== "Undeclared") parts.push(user.major);
  if (user.minors?.trim()) parts.push(`Minors: ${user.minors.trim()}`);
  if (user.college?.trim()) parts.push(user.college.trim());
  if (user.year && user.year !== "Unknown") parts.push(`Class of ${user.year}`);
  return parts.length ? parts.join(" · ") : "";
}

export default function ProfileHeader({ user, actionSlot }: ProfileHeaderProps) {
  const sub = headline(user);

  return (
    <div className="card-surface overflow-hidden shadow-sm">
      <div className="relative h-32 sm:h-40 bg-gradient-to-r from-slate-700 to-slate-900">
        {user.bannerURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.bannerURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
      </div>

      <div className="px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
          <div className="shrink-0">
            <div className="ring-4 ring-[var(--surface)] rounded-full">
              <Avatar text={user.avatar} size="lg" imageUrl={user.photoURL} />
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-2 sm:pt-14">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight truncate">
              {user.name}
            </h1>
            <p className="text-sm text-[var(--muted)] truncate">@{user.handle}</p>
            {sub ? (
              <p className="text-gray-700 mt-1 text-sm flex items-start gap-1.5">
                <GraduationCap className="w-4 h-4 shrink-0 mt-0.5 text-[var(--muted)]" />
                <span>{sub}</span>
              </p>
            ) : null}
          </div>
          {actionSlot ? (
            <div className="flex flex-wrap gap-2 sm:justify-end sm:pb-1">{actionSlot}</div>
          ) : null}
        </div>

        <ProfileLinkRow user={user} />
      </div>
    </div>
  );
}

function ProfileLinkRow({ user }: { user: UserProfile }) {
  const items: { href: string; label: string; icon: React.ReactNode }[] = [];
  if (user.linkedinUrl?.trim()) {
    items.push({
      href: user.linkedinUrl.trim(),
      label: "LinkedIn",
      icon: <Linkedin className="w-4 h-4" />,
    });
  }
  if (user.githubUrl?.trim()) {
    items.push({
      href: user.githubUrl.trim(),
      label: "GitHub",
      icon: <Github className="w-4 h-4" />,
    });
  }
  if (user.portfolioUrl?.trim()) {
    items.push({
      href: user.portfolioUrl.trim(),
      label: "Portfolio",
      icon: <LinkIcon className="w-4 h-4" />,
    });
  }
  if (user.resumeUrl?.trim()) {
    items.push({
      href: user.resumeUrl.trim(),
      label: "Résumé",
      icon: <FileText className="w-4 h-4" />,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border)] flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-gray-800 hover:bg-gray-50 transition min-h-[40px]"
        >
          {item.icon}
          {item.label}
        </a>
      ))}
    </div>
  );
}

/** Compact link chips for edit form preview */
export function ProfileLinksEditorPreview({ user }: { user: UserProfile }) {
  return <ProfileLinkRow user={user} />;
}
