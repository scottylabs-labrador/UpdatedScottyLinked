/**
 * In-app notification categories (stored in users.notification_prefs).
 * Omitted or non-false values mean enabled.
 */

export const NOTIFICATION_CATEGORY_KEYS = [
  "dm",
  "post_comments",
  "connections",
  "groups",
  "projects",
  "moderation",
] as const;

export type NotificationCategoryKey = (typeof NOTIFICATION_CATEGORY_KEYS)[number];

export type NotificationPrefsState = Record<NotificationCategoryKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsState = {
  dm: true,
  post_comments: true,
  connections: true,
  groups: true,
  projects: true,
  moderation: true,
};

const CATEGORY_LABELS: Record<NotificationCategoryKey, string> = {
  dm: "Direct messages",
  post_comments: "Comments on your posts",
  connections: "Connection requests and acceptances",
  groups: "Group join requests and decisions",
  projects: "Interest in your projects",
  moderation: "Moderation (reports and admin alerts)",
};

export function notificationCategoryLabel(key: NotificationCategoryKey): string {
  return CATEGORY_LABELS[key];
}

/** Map a notifications.type row to a preference category. Unknown types stay enabled. */
export function notificationTypeToCategory(
  type: string
): NotificationCategoryKey | null {
  switch (type) {
    case "dm":
      return "dm";
    case "post_comment":
      return "post_comments";
    case "connection_request":
    case "connection_accepted":
      return "connections";
    case "group_join_request":
    case "group_join_accepted":
    case "group_join_rejected":
      return "groups";
    case "project_interest":
      return "projects";
    case "moderation_report":
      return "moderation";
    default:
      return null;
  }
}

export function isNotificationTypeEnabled(
  prefs: Record<string, unknown> | null | undefined,
  type: string
): boolean {
  const cat = notificationTypeToCategory(type);
  if (cat == null) return true;
  const v = prefs?.[cat];
  return v !== false;
}

export function mergeNotificationPrefs(
  raw: unknown
): NotificationPrefsState {
  const out = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  for (const key of NOTIFICATION_CATEGORY_KEYS) {
    if (key in o && typeof o[key] === "boolean") {
      out[key] = o[key] as boolean;
    }
  }
  return out;
}

export function prefsToJsonObject(
  prefs: NotificationPrefsState
): Record<string, boolean> {
  return { ...prefs };
}
