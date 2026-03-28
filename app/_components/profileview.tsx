"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import ProfileHeader from "./ProfileHeader";
import { UserProfile, ProfileOrganization } from "@/lib/types";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface ProfileViewProps {
  user: UserProfile | null;
  loading: boolean;
  onProfileUpdated?: () => void;
}

type OrgRow = { name: string; role: string };

function toForm(user: UserProfile) {
  return {
    name: user.name,
    major: user.major === "Undeclared" ? "" : user.major,
    minors: user.minors,
    degree: user.degree,
    college: user.college,
    year: user.year === "Unknown" ? "" : user.year,
    bio: user.bio,
    skillsText: (user.skills ?? []).join(", "),
    linkedinUrl: user.linkedinUrl,
    githubUrl: user.githubUrl,
    portfolioUrl: user.portfolioUrl,
    resumeUrl: user.resumeUrl,
    photoURL: user.photoURL ?? "",
    bannerURL: user.bannerURL ?? "",
    campusRolesText: (user.campusRoles ?? []).join(", "),
    organizations: (user.organizations ?? []).map((o) => ({
      name: o.name,
      role: o.role ?? "",
    })) as OrgRow[],
  };
}

function formToPreview(user: UserProfile, f: ReturnType<typeof toForm>): UserProfile {
  return {
    ...user,
    name: f.name.trim() || user.name,
    major: f.major.trim() || "Undeclared",
    minors: f.minors.trim(),
    degree: f.degree.trim(),
    college: f.college.trim(),
    year: f.year.trim() || "Unknown",
    bio: f.bio.trim(),
    skills: f.skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    linkedinUrl: f.linkedinUrl.trim(),
    githubUrl: f.githubUrl.trim(),
    portfolioUrl: f.portfolioUrl.trim(),
    resumeUrl: f.resumeUrl.trim(),
    photoURL: f.photoURL.trim() || null,
    bannerURL: f.bannerURL.trim() || null,
    campusRoles: f.campusRolesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    organizations: f.organizations
      .filter((o) => o.name.trim())
      .map((o) => ({
        name: o.name.trim(),
        ...(o.role.trim() ? { role: o.role.trim() } : {}),
      })),
  };
}

export default function ProfileView({
  user,
  loading,
  onProfileUpdated,
}: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadKind, setUploadKind] = useState<"avatar" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    user ? toForm(user) : toForm({} as UserProfile)
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || editing) return;
    setForm(toForm(user));
  }, [user, editing]);

  const previewUser = useMemo(() => {
    if (!user) return null;
    return editing ? formToPreview(user, form) : user;
  }, [editing, user, form]);

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--muted)] text-sm">
        Loading profile…
      </div>
    );
  }

  if (!user || !previewUser) {
    return (
      <div className="max-w-3xl mx-auto card-surface p-10 text-center text-[var(--muted)] text-sm shadow-sm">
        Sign in to view your profile.
      </div>
    );
  }

  const startEditing = () => {
    setForm(toForm(user));
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError(null);
  };

  const runUpload = async (kind: "avatar" | "banner", file: File) => {
    setUploadKind(kind);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/me/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = data.url as string;
      if (kind === "avatar") setForm((f) => ({ ...f, photoURL: url }));
      else setForm((f) => ({ ...f, bannerURL: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadKind(null);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const orgs: ProfileOrganization[] = form.organizations
        .filter((o) => o.name.trim())
        .map((o) => ({
          name: o.name.trim(),
          ...(o.role.trim() ? { role: o.role.trim() } : {}),
        }));

      const body: Record<string, unknown> = {
        fullName: form.name.trim() || undefined,
        major: form.major.trim() || null,
        minors: form.minors.trim() || null,
        degree: form.degree.trim() || null,
        college: form.college.trim() || null,
        year: form.year.trim() || null,
        bio: form.bio.trim() || null,
        photoURL: form.photoURL.trim() || null,
        bannerURL: form.bannerURL.trim() || null,
        linkedinUrl: form.linkedinUrl.trim() || null,
        githubUrl: form.githubUrl.trim() || null,
        portfolioUrl: form.portfolioUrl.trim() || null,
        resumeUrl: form.resumeUrl.trim() || null,
        skills: form.skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        campusRoles: form.campusRolesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        organizations: orgs,
      };

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Update failed");
      }
      setEditing(false);
      onProfileUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const addOrg = () => {
    setForm((f) => ({
      ...f,
      organizations: [...f.organizations, { name: "", role: "" }],
    }));
  };

  const removeOrg = (index: number) => {
    setForm((f) => ({
      ...f,
      organizations: f.organizations.filter((_, i) => i !== index),
    }));
  };

  const updateOrg = (index: number, field: keyof OrgRow, value: string) => {
    setForm((f) => ({
      ...f,
      organizations: f.organizations.map((o, i) =>
        i === index ? { ...o, [field]: value } : o
      ),
    }));
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <ProfileHeader
        user={previewUser}
        actionSlot={
          <>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[40px] text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 min-h-[40px] bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-hover)] disabled:opacity-50 font-semibold text-sm"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 min-h-[40px] border-2 border-[var(--brand)] text-[var(--brand)] rounded-lg hover:bg-blue-50/80 transition font-semibold text-sm"
              >
                Edit profile
              </button>
            )}
          </>
        }
      />

      {error && (
        <p className="text-red-600 text-sm px-1" role="alert">
          {error}
        </p>
      )}

      {editing ? (
        <div className="card-surface p-5 sm:p-6 shadow-sm space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Photos
            </h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Profile photo</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!!uploadKind}
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-gray-50 min-h-[40px] inline-flex items-center gap-2"
                  >
                    {uploadKind === "avatar" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Upload
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void runUpload("avatar", file);
                    }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Banner</p>
                <button
                  type="button"
                  disabled={!!uploadKind}
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-gray-50 min-h-[40px] inline-flex items-center gap-2"
                >
                  {uploadKind === "banner" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Upload
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void runUpload("banner", file);
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              Or paste HTTPS image URLs (e.g. from your host). Max 5MB per upload.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <label className="block text-sm">
                <span className="text-gray-700 font-medium">Photo URL</span>
                <input
                  type="url"
                  value={form.photoURL}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, photoURL: e.target.value }))
                  }
                  placeholder="https://…"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700 font-medium">Banner URL</span>
                <input
                  type="url"
                  value={form.bannerURL}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bannerURL: e.target.value }))
                  }
                  placeholder="https://…"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Basics
            </h3>
            <label className="block text-sm font-medium text-gray-700">
              Full name
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Academic
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Major
                <input
                  type="text"
                  value={form.major}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, major: e.target.value }))
                  }
                  placeholder="e.g. Computer Science"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Minors
                <input
                  type="text"
                  value={form.minors}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minors: e.target.value }))
                  }
                  placeholder="e.g. Statistics, HCI"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Degree
                <input
                  type="text"
                  value={form.degree}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, degree: e.target.value }))
                  }
                  placeholder="e.g. B.S."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                College
                <input
                  type="text"
                  value={form.college}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, college: e.target.value }))
                  }
                  placeholder="e.g. School of Computer Science"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
                Class year
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                  placeholder="e.g. 2026"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </label>
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              About
            </label>
            <textarea
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
              rows={5}
              placeholder="Interests, goals, what you are looking for on ScottyLinked…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 resize-none"
            />
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={form.skillsText}
              onChange={(e) =>
                setForm((f) => ({ ...f, skillsText: e.target.value }))
              }
              placeholder="e.g. React, Python, public speaking"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </section>

          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campus roles (comma-separated)
            </label>
            <input
              type="text"
              value={form.campusRolesText}
              onChange={(e) =>
                setForm((f) => ({ ...f, campusRolesText: e.target.value }))
              }
              placeholder="e.g. Teaching assistant, Orientation counselor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Links (https only)
            </h3>
            <div className="space-y-3">
              {(
                [
                  ["linkedinUrl", "LinkedIn"],
                  ["githubUrl", "GitHub"],
                  ["portfolioUrl", "Portfolio / website"],
                  ["resumeUrl", "Résumé (PDF URL)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="text-gray-700 font-medium">{label}</span>
                  <input
                    type="url"
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    placeholder="https://…"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Organizations & clubs
              </h3>
              <button
                type="button"
                onClick={addOrg}
                className="text-sm inline-flex items-center gap-1 text-[var(--brand)] font-medium hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {form.organizations.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row gap-2 sm:items-end"
                >
                  <label className="flex-1 text-sm">
                    <span className="text-gray-700 font-medium">Name</span>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateOrg(i, "name", e.target.value)
                      }
                      placeholder="Organization name"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </label>
                  <label className="flex-1 text-sm">
                    <span className="text-gray-700 font-medium">Role (optional)</span>
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) =>
                        updateOrg(i, "role", e.target.value)
                      }
                      placeholder="e.g. Officer, Member"
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeOrg(i)}
                    className="p-2 text-red-700 hover:bg-red-50 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Remove organization"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.organizations.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  Add student orgs, clubs, or teams you are part of.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card-surface p-5 sm:p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Contact
              </h3>
              <p className="text-gray-800">{user.email}</p>
            </div>

            {user.bio?.trim() ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  About
                </h3>
                <p className="text-gray-800 whitespace-pre-wrap">{user.bio}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No bio yet. Edit your profile to add one.</p>
            )}

            {(user.campusRoles?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Campus roles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.campusRoles.map((r, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md text-sm"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(user.organizations?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  Organizations
                </h3>
                <ul className="space-y-2">
                  {user.organizations.map((o, idx) => (
                    <li key={idx} className="text-gray-800">
                      <span className="font-medium">{o.name}</span>
                      {o.role ? (
                        <span className="text-[var(--muted)]"> — {o.role}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user.skills && user.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-md text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                Connections
              </h3>
              <p className="text-gray-800 font-medium">{user.connections}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
