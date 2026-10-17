"use client";

import { useFormatter, useTranslations } from "next-intl";

const ONLINE_MS = 120_000;

export type Presence = { online: boolean; label: string } | null;
/** "online" when lastSeenAt is under ~2min old (presence touch is periodic — approximation), else "last seen X ago". */
export function usePresenceLabel(lastSeenAt: Date | string | null | undefined): Presence {
  const t = useTranslations("conversations");
  const format = useFormatter();
  if (!lastSeenAt) return { online: false, label: t("offline") };
  const ts = new Date(lastSeenAt).getTime();
  if (Date.now() - ts < ONLINE_MS) return { online: true, label: t("online") };
  return { online: false, label: t("lastSeen", { time: format.relativeTime(new Date(ts)) }) };
}
