"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUpdateConversation } from "@/features/conversations/hooks";

export function RenameGroupDialog({
  conversationId,
  currentName,
  open,
  onOpenChange,
}: {
  conversationId: string;
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("conversations");
  const rename = useUpdateConversation(conversationId);
  const [name, setName] = useState(currentName);

  // Re-seed the field whenever the dialog opens.
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const trimmed = name.trim();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("renameGroup")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="rename-group-name">
            {t("groupName")}
          </label>
          <Input
            id="rename-group-name"
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>
        {rename.isError && (
          <p className="text-error text-sm" role="alert">
            {t("renameFailed")}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={trimmed.length === 0 || rename.isPending}
            onClick={() => rename.mutate(trimmed, { onSuccess: () => onOpenChange(false) })}
          >
            {rename.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
