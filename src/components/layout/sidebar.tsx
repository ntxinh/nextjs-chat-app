"use client";

import { LogOut, Search, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth/client";

export function Sidebar() {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const tv = useTranslations("conversations");
  const router = useRouter();
  const { data } = useSession();
  const userName = data?.user.name || t("userName");
  const userInitial = (data?.user.name || t("userInitial")).charAt(0).toUpperCase();

  async function onSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between p-3">
        <h1 className="font-semibold text-lg">{tc("appName")}</h1>
        <Button aria-label={t("newChat")} className="size-11" disabled size="icon" variant="ghost">
          <SquarePen aria-hidden="true" />
        </Button>
      </div>
      <div className="px-3 pb-3">
        <Input
          aria-label={t("search")}
          className="h-11"
          disabled
          placeholder={t("searchPlaceholder")}
          type="search"
        />
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
          <Search aria-hidden="true" className="size-6" />
          <p className="text-sm">{tv("empty")}</p>
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex items-center gap-3 p-3">
        <Avatar>
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate font-medium text-sm">{userName}</span>
        <ThemeToggle />
        <Button
          aria-label={ta("signOut")}
          className="size-11"
          onClick={onSignOut}
          size="icon"
          variant="ghost"
        >
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
