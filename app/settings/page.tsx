"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppPageContainer } from "@/app/_components/AppShell";
import {
  NOTIFICATION_CATEGORY_KEYS,
  mergeNotificationPrefs,
  notificationCategoryLabel,
  type NotificationCategoryKey,
  type NotificationPrefsState,
} from "@/lib/notificationPrefs";
import type { ThemeMode } from "@/lib/theme";
import { writeStoredTheme } from "@/lib/theme";

type Preferences = {
  discoverable: boolean;
  notificationPrefs: NotificationPrefsState;
  theme: ThemeMode;
};

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setPrefs(null);
        setEmail(null);
        return;
      }
      setEmail(data.user?.email ?? null);
      if (data.preferences) {
        setPrefs({
          discoverable: !!data.preferences.discoverable,
          notificationPrefs: mergeNotificationPrefs(
            data.preferences.notificationPrefs
          ),
          theme: data.preferences.theme === "dark" ? "dark" : "light",
        });
      } else {
        setPrefs(null);
      }
    } catch {
      setError("Failed to load settings.");
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchSettings = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data.error as string) ?? "Could not save settings.");
        void load();
        return;
      }
      if (data.preferences) {
        setPrefs({
          discoverable: !!data.preferences.discoverable,
          notificationPrefs: mergeNotificationPrefs(
            data.preferences.notificationPrefs
          ),
          theme: data.preferences.theme === "dark" ? "dark" : "light",
        });
      }
    } catch {
      setError("Could not save settings.");
      void load();
    } finally {
      setSaving(false);
    }
  };

  const setDiscoverable = (discoverable: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, discoverable });
    void patchSettings({ discoverable });
  };

  const setNotif = (key: NotificationCategoryKey, enabled: boolean) => {
    if (!prefs) return;
    const notificationPrefs = { ...prefs.notificationPrefs, [key]: enabled };
    setPrefs({ ...prefs, notificationPrefs });
    void patchSettings({ notificationPrefs });
  };

  const setTheme = (theme: ThemeMode) => {
    if (!prefs) return;
    setPrefs({ ...prefs, theme });
    writeStoredTheme(theme);
    void patchSettings({ theme });
  };

  return (
    <AppPageContainer>
      <div className="space-y-8">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--brand)] hover:underline"
          >
            ← Back to home
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Control notifications, who can find you on Network, and appearance.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : !prefs ? (
          <div className="card-surface p-6 shadow-sm">
            <p className="text-sm text-[var(--muted)]">
              Sign in with your Andrew account to manage settings.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Log in
            </Link>
          </div>
        ) : (
          <>
            <section className="card-surface p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                Appearance
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Choose light or dark surfaces across the app.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={saving}
                    onClick={() => setTheme(mode)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] border transition ${
                      prefs.theme === mode
                        ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                        : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hit-hover)]"
                    }`}
                  >
                    {mode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </section>

            <section className="card-surface p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                Profile visibility
              </h2>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.discoverable}
                  disabled={saving}
                  onChange={(e) => setDiscoverable(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--brand)]"
                />
                <span>
                  <span className="font-medium text-[var(--foreground)] block">
                    Appear in Discover and search
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    When off, other students will not see you in the Network
                    “Discover” list or search results. Your profile link still
                    works for people who have the URL.
                  </span>
                </span>
              </label>
            </section>

            <section className="card-surface p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                In-app notifications
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Choose which events create an entry in your notification bell.
                This does not affect email (we do not send email notifications
                from these toggles).
              </p>
              <ul className="space-y-3">
                {NOTIFICATION_CATEGORY_KEYS.map((key) => (
                  <li key={key}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.notificationPrefs[key]}
                        disabled={saving}
                        onChange={(e) => setNotif(key, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--brand)]"
                      />
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {notificationCategoryLabel(key)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card-surface p-5 sm:p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                Account
              </h2>
              {email ? (
                <p className="text-sm text-[var(--foreground)]">
                  Signed in as <span className="font-medium">{email}</span>
                </p>
              ) : null}
              <p className="text-xs text-[var(--muted)]">
                To edit your name, photo, bio, and links, open the{" "}
                <Link
                  href="/?tab=profile"
                  className="text-[var(--brand)] font-medium hover:underline"
                >
                  Profile
                </Link>{" "}
                tab.
              </p>
            </section>
          </>
        )}
      </div>
    </AppPageContainer>
  );
}
