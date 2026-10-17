"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { signUp } from "@/lib/auth/client";
import { signUpSchema } from "@/lib/validation/auth";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = signUpSchema.safeParse(data);
    if (!parsed.success) {
      setError(t("errors.invalidInput"));
      return;
    }
    setError(null);
    setPending(true);
    const { error } = await signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setPending(false);
    if (error) {
      setError(
        error.status === 429
          ? t("errors.tooManyAttempts")
          : error.code?.startsWith("USER_ALREADY_EXISTS")
            ? t("errors.emailTaken")
            : t("errors.generic"),
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor="name">
          {t("name")}
        </label>
        <Input autoComplete="name" id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor="email">
          {t("email")}
        </label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-sm" htmlFor="password">
          {t("password")}
        </label>
        <Input autoComplete="new-password" id="password" name="password" required type="password" />
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button className="h-11" disabled={pending} type="submit">
        {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}
