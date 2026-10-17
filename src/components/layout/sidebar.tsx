"use client";

import { LogOut, Settings, SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ConversationList } from "@/features/conversations/conversation-list";
import { NewDmDialog } from "@/features/conversations/new-dm-dialog";
import { NewGroupDialog } from "@/features/conversations/new-group-dialog";
import { Link, useRouter } from "@/i18n/navigation";
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
  const [dmOpen, setDmOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  async function onSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between p-3">
        <h1 className="font-semibold text-lg">{tc("appName")}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={t("newChat")} className="size-11" size="icon" variant="ghost">
              <SquarePen aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDmOpen(true)}>{tv("newDirect")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setGroupOpen(true)}>
              {tv("newGroup")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ConversationList onNewChat={() => setDmOpen(true)} />
      <Separator />
      <div className="flex items-center gap-3 p-3">
        <Avatar>
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate font-medium text-sm">{userName}</span>
        <ThemeToggle />
        <Button aria-label={t("settings")} asChild className="size-11" size="icon" variant="ghost">
          <Link href="/settings">
            <Settings aria-hidden="true" />
          </Link>
        </Button>
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
      <NewDmDialog onOpenChange={setDmOpen} open={dmOpen} />
      <NewGroupDialog onOpenChange={setGroupOpen} open={groupOpen} />
    </aside>
  );
}
