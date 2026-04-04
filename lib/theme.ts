export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "scotty-theme";

export function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark";
}

export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(t) ? t : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyThemeToDocument(mode);
}
