import "server-only";
import { AppError } from "@/lib/errors/app-error";
import type { MessageRow } from "@/server/repositories/messages";

/** Only the sender may mutate a message. */
export function assertOwnership(message: MessageRow, actorId: string): void {
  if (message.senderId !== actorId) {
    throw new AppError(403, "forbidden", "Not the message author");
  }
}
