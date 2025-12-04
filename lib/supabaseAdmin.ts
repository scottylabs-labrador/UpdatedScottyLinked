import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Only create admin client if we have the required environment variables
// This should only be used in server-side code (API routes, server components)
let supabaseAdmin: SupabaseClient | null = null;

try {
  // Only initialize on server-side
  if (typeof window === "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && serviceRole) {
      supabaseAdmin = createClient(url, serviceRole, {
        auth: { persistSession: false }, // usually desirable for server admin client
      });
    }
  }
} catch (error) {
  // Silently fail if env vars are missing or client creation fails
  // This allows the module to be imported safely on client-side
  console.warn(
    "supabaseAdmin not available:",
    error instanceof Error ? error.message : "env vars missing"
  );
  supabaseAdmin = null;
}

export { supabaseAdmin };
