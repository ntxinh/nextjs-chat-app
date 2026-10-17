"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAddMember } from "@/features/conversations/hooks";
import { UserSearch } from "@/features/conversations/user-search";
import { ApiClientError } from "@/lib/api-client";

export function AddMemberDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("conversations");
  const addMember = useAddMember(conversationId);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addMember")}</DialogTitle>
        </DialogHeader>
        <UserSearch
          onPick={(userId) =>
            addMember.mutate(userId, {
              onSuccess: () => onOpenChange(false),
              onError: (error) => {
                // Re-adding an active member (409) isn't an error — just close.
                if (error instanceof ApiClientError && error.status === 409) onOpenChange(false);
              },
            })
          }
        />
        {addMember.isError && (
          <p className="text-error text-sm" role="alert">
            {t("addMemberFailed")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
