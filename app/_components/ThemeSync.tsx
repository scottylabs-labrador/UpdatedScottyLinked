"use client";

import { useEffect } from "react";
import {
  applyThemeToDocument,
  isThemeMode,
  readStoredTheme,
  writeStoredTheme,
} from "@/lib/theme";

/**
 * Applies theme after load: signed-in users follow server preference; otherwise localStorage.
 */
export default function ThemeSync() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const serverTheme = d.preferences?.theme;
        if (isThemeMode(serverTheme)) {
          writeStoredTheme(serverTheme);
          return;
        }
        const local = readStoredTheme();
        if (local) applyThemeToDocument(local);
      })
      .catch(() => {
        if (cancelled) return;
        const local = readStoredTheme();
        if (local) applyThemeToDocument(local);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
