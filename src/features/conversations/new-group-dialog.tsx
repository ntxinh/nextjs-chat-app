"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateConversation } from "@/features/conversations/hooks";
import { UserSearch } from "@/features/conversations/user-search";

export function NewGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("conversations");
  const create = useCreateConversation();
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  const toggle = (userId: string) =>
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newGroup")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="group-name">
            {t("groupName")}
          </label>
          <Input
            id="group-name"
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        <UserSearch onToggle={toggle} selectedIds={memberIds} />
        {create.isError && (
          <p className="text-error text-sm" role="alert">
            {t("createFailed")}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={name.trim().length === 0 || create.isPending}
            onClick={() =>
              create.mutate(
                { type: "group", name: name.trim(), memberIds: [...memberIds] },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {create.isPending ? t("creating") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
