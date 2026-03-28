"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logo from "../147268137.png";
import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/app/auth/login/actions";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoading(false);
      if (user) router.replace("/");
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (result.url) window.location.href = result.url;
    else setError(result.error ?? "Sign-in failed");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
        <p className="text-[var(--muted)] text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm card-surface p-8 shadow-sm text-center">
        <Image
          src={logo}
          alt="ScottyLinked"
          width={72}
          height={72}
          className="rounded-xl mx-auto mb-5"
        />
        <h1 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
          ScottyLinked
        </h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          Sign in with your @andrew.cmu.edu account to continue.
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full px-6 py-3 min-h-[48px] text-white bg-[var(--brand)] rounded-lg hover:bg-[var(--brand-hover)] font-semibold text-sm"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
