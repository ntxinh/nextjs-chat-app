"use client";

import { cn } from "cn";
import { Pencil, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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
import {
  type UiMessage,
  useDeleteMessage,
  useEditMessage,
  useSendMessage,
} from "@/features/messages/hooks";

type Props = {
  conversationId: string;
  message: UiMessage;
  own: boolean;
  /** Group chats show sender name/avatar; runs collapse them on continuation. */
  showSender: boolean;
  isGroup: boolean;
};

export function MessageBubble({ conversationId, message, own, showSender, isGroup }: Props) {
  const t = useTranslations("messages");
  const format = useFormatter();
  const edit = useEditMessage(conversationId);
  const del = useDeleteMessage(conversationId);
  const send = useSendMessage(conversationId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const createdAt = new Date(message.createdAt);
  const timeTitle = format.dateTime(createdAt, { dateStyle: "medium", timeStyle: "short" });
  const timeShort = format.dateTime(createdAt, { hour: "numeric", minute: "numeric" });

  const saveEdit = () => {
    const body = draft.trim();
    if (!body || body === message.body) {
      setEditing(false);
      setDraft(message.body);
      return;
    }
    edit.mutate({ messageId: message.id, body }, { onSuccess: () => setEditing(false) });
  };

  return (
    <li
      className={cn(
        "group flex gap-2",
        own ? "justify-end" : "justify-start",
        showSender ? "mt-3" : "mt-0.5",
      )}
    >
      {!own && (
        <div className="w-6 shrink-0">
          {showSender && (
            <Avatar size="sm">
              {message.sender.image && <AvatarImage alt="" src={message.sender.image} />}
              <AvatarFallback>{message.sender.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      <div className={cn("flex max-w-[75%] flex-col", own ? "items-end" : "items-start")}>
        {isGroup && !own && showSender && (
          <span className="mb-0.5 px-1 text-muted-foreground text-xs">{message.sender.name}</span>
        )}
        <div className={cn("flex items-end gap-1", own && "flex-row-reverse")}>
          {editing ? (
            <div className="flex flex-col gap-1">
              <textarea
                aria-label={t("editLabel")}
                ref={(el) => el?.focus()}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(message.body);
                  }
                }}
                value={draft}
              />
              <div className="flex gap-1">
                <Button disabled={edit.isPending} onClick={saveEdit} size="sm">
                  {t("save")}
                </Button>
                <Button
                  disabled={edit.isPending}
                  onClick={() => {
                    setEditing(false);
                    setDraft(message.body);
                  }}
                  size="sm"
                  variant="outline"
                >
                  {t("cancel")}
                </Button>
              </div>
              {edit.isError && (
                <p className="text-error text-xs" role="alert">
                  {t("editFailed")}
                </p>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-2xl px-3 py-2",
                own ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                message.deleted && "bg-transparent text-muted-foreground italic",
                message.pending && "opacity-70",
                message.failed && "ring-1 ring-error/50",
              )}
              title={timeTitle}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.deleted ? t("deleted") : message.body}
              </p>
            </div>
          )}
          {own && !editing && !message.deleted && !message.pending && !message.failed && (
            <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <Button
                aria-label={t("edit")}
                className="size-8"
                onClick={() => {
                  setDraft(message.body);
                  setEditing(true);
                }}
                size="icon"
                variant="ghost"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
              </Button>
              <Button
                aria-label={t("delete")}
                className="size-8"
                onClick={() => setConfirmDelete(true)}
                size="icon"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
        <span className="mt-0.5 flex items-center gap-1.5 px-1 text-muted-foreground text-xs">
          {message.pending ? (
            t("sending")
          ) : message.failed ? (
            <>
              <span className="text-error">{t("sendFailed")}</span>
              <Button
                className="h-5 px-1.5 text-xs"
                onClick={() =>
                  send.mutate({
                    body: message.body,
                    clientMessageId: message.clientMessageId ?? crypto.randomUUID(),
                    sender: message.sender,
                  })
                }
                size="sm"
                variant="ghost"
              >
                {t("retry")}
              </Button>
            </>
          ) : (
            <>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                {timeShort}
              </span>
              {message.editedAt && !message.deleted && !editing && <span>{t("edited")}</span>}
            </>
          )}
        </span>
        {del.isError && (
          <p className="px-1 text-error text-xs" role="alert">
            {t("deleteFailed")}
          </p>
        )}
      </div>

      <Dialog onOpenChange={setConfirmDelete} open={confirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{t("deleteConfirmBody")}</p>
          <DialogFooter>
            <Button onClick={() => setConfirmDelete(false)} variant="outline">
              {t("cancel")}
            </Button>
            <Button
              disabled={del.isPending}
              onClick={() => del.mutate(message.id, { onSuccess: () => setConfirmDelete(false) })}
              variant="destructive"
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
