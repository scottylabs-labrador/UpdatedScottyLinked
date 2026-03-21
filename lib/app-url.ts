/**
 * Canonical public base URL for OAuth redirects and absolute links.
 * Priority: NEXT_PUBLIC_APP_URL (set in Vercel for custom domains) →
 * VERCEL_URL (auto on Vercel previews/production) → localhost for dev.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}
