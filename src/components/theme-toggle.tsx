"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEMES = ["light", "dark", "system"] as const;

const ICONS: Record<(typeof THEMES)[number], React.ReactNode> = {
  light: (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  dark: (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  system: (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="14" rx="2" width="20" x="2" y="3" />
      <path d="M8 21h8m-4-4v4" />
    </svg>
  ),
};

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mounted flag: documented next-themes hydration pattern — theme is unknown until client mount.
  useEffect(() => setMounted(true), []);

  return (
    <fieldset className="m-0 flex gap-1 border-0 p-0">
      <legend className="sr-only">{t("toggle")}</legend>
      {THEMES.map((value) => (
        <button
          aria-label={t(value)}
          aria-pressed={mounted && theme === value}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          key={value}
          onClick={() => setTheme(value)}
          title={t(value)}
          type="button"
        >
          {ICONS[value]}
        </button>
      ))}
    </fieldset>
  );
}
