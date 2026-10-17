import { getTranslations, setRequestLocale } from "next-intl/server";
import { Separator } from "@/components/ui/separator";
import { AccountSection } from "@/features/settings/account-section";
import { PreferencesSection } from "@/features/settings/preferences-section";
import { ProfileForm } from "@/features/settings/profile-form";
import { requireUser } from "@/server/policies/auth";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireUser();
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 overflow-y-auto p-6">
      <h1 className="font-semibold text-xl">{t("title")}</h1>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-base">{t("profile")}</h2>
        <ProfileForm initialImage={me.image ?? null} initialName={me.name} />
      </section>
      <Separator />
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-base">{t("preferences")}</h2>
        <PreferencesSection />
      </section>
      <Separator />
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-base">{t("dangerZone")}</h2>
        <AccountSection />
      </section>
    </div>
  );
}
