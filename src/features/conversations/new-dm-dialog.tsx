"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateConversation } from "@/features/conversations/hooks";
import { UserSearch } from "@/features/conversations/user-search";

export function NewDmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("conversations");
  const create = useCreateConversation();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newDirect")}</DialogTitle>
        </DialogHeader>
        <UserSearch
          onPick={(userId) => {
            create.mutate({ type: "direct", userId });
            onOpenChange(false);
          }}
        />
        {create.isError && (
          <p className="text-error text-sm" role="alert">
            {t("createFailed")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
