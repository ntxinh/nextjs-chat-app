"use client";

import { DoorOpen, Pencil, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AddMemberDialog } from "@/features/conversations/add-member-dialog";
import { conversationName } from "@/features/conversations/conversation-item";
import { useConversation, useLeaveConversation } from "@/features/conversations/hooks";
import { ParticipantList } from "@/features/conversations/participant-list";
import { usePresenceLabel } from "@/features/conversations/presence";
import { RenameGroupDialog } from "@/features/conversations/rename-group-dialog";
import { useSession } from "@/lib/auth/client";
import { useUiStore } from "@/stores/ui";

export function ConversationDetails({ conversationId }: { conversationId: string }) {
  const t = useTranslations("conversations");
  const { data, isPending, isError } = useConversation(conversationId);
  const { data: session } = useSession();
  const leave = useLeaveConversation(conversationId);
  const closeDetails = useUiStore((s) => s.closeDetails);
  const [renameOpen, setRenameOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        {["s1", "s2", "s3"].map((k) => (
          <Skeleton className="h-8 w-full" key={k} />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <p className="p-4 text-error text-sm">{t("loadFailed")}</p>;
  }

  const isGroup = data.type === "group";
  const me = session?.user.id ? data.members.find((m) => m.id === session.user.id) : undefined;
  const isOwner = isGroup && me?.role === "owner";
  const name = conversationName(data, t("unknownName"));
  const peer = isGroup ? undefined : data.members.find((m) => m.id === data.otherUser?.id);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          {peer?.image && <AvatarImage alt="" src={peer.image} />}
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold text-base">{name}</span>
          <PeerPresence lastSeenAt={peer?.lastSeenAt} />
        </div>
      </div>
      <Separator />

      {isGroup && (
        <>
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t("participants")}
          </h3>
          <ParticipantList members={data.members} meId={session?.user.id} showRoles />
          <Separator />
        </>
      )}

      {isOwner && (
        <div className="flex flex-col gap-1">
          <Button className="justify-start" onClick={() => setRenameOpen(true)} variant="ghost">
            <Pencil aria-hidden="true" />
            {t("rename")}
          </Button>
          <Button className="justify-start" onClick={() => setAddOpen(true)} variant="ghost">
            <UserPlus aria-hidden="true" />
            {t("addMember")}
          </Button>
        </div>
      )}

      <Button
        className="justify-start"
        disabled={leave.isPending}
        onClick={() => setLeaveOpen(true)}
        variant="destructive"
      >
        <DoorOpen aria-hidden="true" />
        {t("leaveConversation")}
      </Button>
      {leave.isError && (
        <p className="text-error text-sm" role="alert">
          {t("leaveFailed")}
        </p>
      )}

      {isGroup && (
        <>
          <RenameGroupDialog
            conversationId={data.id}
            currentName={data.name ?? name}
            onOpenChange={setRenameOpen}
            open={renameOpen}
          />
          <AddMemberDialog conversationId={data.id} onOpenChange={setAddOpen} open={addOpen} />
        </>
      )}

      <Dialog onOpenChange={setLeaveOpen} open={leaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("leaveConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{t("leaveConfirmBody")}</p>
          <DialogFooter>
            <Button onClick={() => setLeaveOpen(false)} variant="outline">
              {t("cancel")}
            </Button>
            <Button
              disabled={leave.isPending}
              onClick={() =>
                leave.mutate(undefined, {
                  onSuccess: () => {
                    setLeaveOpen(false);
                    closeDetails();
                  },
                })
              }
              variant="destructive"
            >
              {t("leaveConversation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeerPresence({ lastSeenAt }: { lastSeenAt: string | Date | null | undefined }) {
  const presence = usePresenceLabel(lastSeenAt);
  if (!presence) return null;
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
      {presence.online && (
        <span aria-hidden="true" className="inline-block size-2 rounded-full bg-success" />
      )}
      {presence.label}
    </span>
  );
}
