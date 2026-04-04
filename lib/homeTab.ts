export type HomeTab = "feed" | "groups" | "network" | "profile";

export function tabFromSearchString(search: string): HomeTab {
  const q = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const t = q.get("tab");
  if (t === "groups" || t === "network" || t === "profile") return t;
  if (t === "opportunities") return "groups";
  return "feed";
}
