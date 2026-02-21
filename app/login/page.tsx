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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src={logo}
          alt="ScottyLinked"
          width={80}
          height={80}
          className="rounded-xl mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ScottyLinked
        </h1>
        <p className="text-gray-600 mb-8">
          Sign in with your @andrew.cmu.edu account to continue.
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
        >
          Login with Google
        </button>
      </div>
    </div>
  );
}
