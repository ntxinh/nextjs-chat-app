"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { authClient, signOut } from "@/lib/auth/client";

export function AccountSection() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setError(null);
    setPending(true);
    const { error } = await authClient.deleteUser({ password });
    setPending(false);
    if (error) {
      setError(t("deleteFailed"));
      return;
    }
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="font-medium text-sm">{t("deleteAccount")}</span>
        <span className="text-muted-foreground text-xs">{t("deleteAccountHint")}</span>
      </div>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button variant="destructive">{t("deleteAccount")}</Button>
        </DialogTrigger>
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={onDelete}>
            <DialogHeader>
              <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
              <DialogDescription>{t("deleteConfirmBody")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-sm" htmlFor="delete-password">
                {t("confirmPassword")}
              </label>
              <Input
                autoComplete="current-password"
                id="delete-password"
                name="password"
                required
                type="password"
              />
            </div>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button disabled={pending} type="submit" variant="destructive">
                {pending ? t("deleting") : t("deleteConfirmButton")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
