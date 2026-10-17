"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { patchMeSchema } from "@/lib/validation/me";

// ponytail: plain fetch + router.refresh; upgrades to a TanStack Query mutation in Task 19.
export function ProfileForm({
  initialName,
  initialImage,
}: {
  initialName: string;
  initialImage: string | null;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = patchMeSchema.safeParse({
      name: raw.name,
      image: raw.image === "" ? null : raw.image,
    });
    if (!parsed.success) {
      setError(t("invalidInput"));
      return;
    }
    setError(null);
    setSaved(false);
    setPending(true);
    const res = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);
    if (!res.ok) {
      setError(t("saveFailed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor="name">
          {t("name")}
        </label>
        <Input
          autoComplete="name"
          defaultValue={initialName}
          id="name"
          maxLength={100}
          name="name"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor="image">
          {t("avatarUrl")}
        </label>
        <Input
          autoComplete="url"
          defaultValue={initialImage ?? ""}
          id="image"
          name="image"
          placeholder={t("avatarUrlPlaceholder")}
          type="url"
        />
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-muted-foreground text-sm">{t("saved")}</p>}
      <Button className="h-11 self-start" disabled={pending} type="submit">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
