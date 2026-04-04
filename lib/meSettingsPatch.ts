import {
  mergeNotificationPrefs,
  prefsToJsonObject,
  type NotificationPrefsState,
} from "@/lib/notificationPrefs";
import { isThemeMode, type ThemeMode } from "@/lib/theme";

export type MeSettingsPatch = {
  discoverable?: boolean;
  notificationPrefs?: NotificationPrefsState;
  theme?: ThemeMode;
};

export function parseMeSettingsPatch(
  body: unknown
): { ok: true; patch: MeSettingsPatch } | { ok: false; error: string } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Expected JSON object" };
  }
  const o = body as Record<string, unknown>;
  const patch: MeSettingsPatch = {};

  if ("discoverable" in o) {
    if (typeof o.discoverable !== "boolean") {
      return { ok: false, error: "discoverable must be a boolean" };
    }
    patch.discoverable = o.discoverable;
  }

  if ("notificationPrefs" in o) {
    if (o.notificationPrefs == null || typeof o.notificationPrefs !== "object") {
      return { ok: false, error: "notificationPrefs must be an object" };
    }
    patch.notificationPrefs = mergeNotificationPrefs(o.notificationPrefs);
  }

  if ("theme" in o) {
    if (!isThemeMode(o.theme)) {
      return { ok: false, error: "theme must be light or dark" };
    }
    patch.theme = o.theme;
  }

  if (
    patch.discoverable === undefined &&
    patch.notificationPrefs === undefined &&
    patch.theme === undefined
  ) {
    return { ok: false, error: "No valid fields to update" };
  }

  return { ok: true, patch };
}

export function userPreferencesPayload(user: {
  discoverable: boolean;
  notificationPrefs: NotificationPrefsState;
  theme: ThemeMode;
}) {
  return {
    discoverable: user.discoverable,
    notificationPrefs: prefsToJsonObject(user.notificationPrefs),
    theme: user.theme,
  };
}
