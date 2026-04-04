"use client";

import Link from "next/link";
import Avatar from "./Avatar";
import { Users, MessageCircle, UserRound, LogOut, Shield } from "lucide-react";
import { signOut } from "@/app/auth/login/actions";
import { useHomeTab } from "./HomeTabNav";

type HomeRailProps = {
  user: {
    id: number;
    fullName: string;
    photoURL: string | null;
    handle: string;
  };
  profileIncomplete?: boolean;
  isModerator?: boolean;
};

export default function HomeRail({
  user,
  profileIncomplete,
  isModerator,
}: HomeRailProps) {
  const { setHomeTab } = useHomeTab();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setHomeTab("profile")}
        className="card-surface p-4 shadow-sm block hover:border-[var(--brand)]/25 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-3">
          <Avatar
            text={user.fullName.slice(0, 2).toUpperCase()}
            size="md"
            imageUrl={user.photoURL}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
            <p className="text-xs text-[var(--muted)] truncate">@{user.handle}</p>
          </div>
        </div>
      </button>

      {profileIncomplete && (
        <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/80 p-4 text-sm">
          <p className="font-medium text-amber-900">Complete your profile</p>
          <p className="text-amber-800/90 mt-1 text-xs">
            Add your major and bio so people can find you on Network.
          </p>
          <button
            type="button"
            onClick={() => setHomeTab("profile")}
            className="mt-2 inline-flex font-medium text-[var(--brand)] text-sm hover:underline"
          >
            Go to Profile tab
          </button>
        </div>
      )}

      <div className="card-surface p-2 shadow-sm">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Shortcuts
        </p>
        <button
          type="button"
          onClick={() => setHomeTab("network")}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition text-left"
        >
          <Users className="w-5 h-5 text-[var(--muted)]" />
          Network
        </button>
        <Link
          href="/messages"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition"
        >
          <MessageCircle className="w-5 h-5 text-[var(--muted)]" />
          Messages
        </Link>
        <Link
          href={`/profile/${user.id}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition"
        >
          <UserRound className="w-5 h-5 text-[var(--muted)]" />
          View profile
        </Link>
        {isModerator && (
          <Link
            href="/admin/reports"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition"
          >
            <Shield className="w-5 h-5 text-[var(--muted)]" />
            Moderation
          </Link>
        )}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            window.location.href = "/";
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition text-left"
        >
          <LogOut className="w-5 h-5 text-[var(--muted)]" />
          Log out
        </button>
      </div>
    </div>
  );
}
