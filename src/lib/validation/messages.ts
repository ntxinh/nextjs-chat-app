import { z } from "zod";

// 4000 mirrors the SQL CHECK on messages.body — keep the two in sync.
export const MESSAGE_BODY_MAX = 4000;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
  clientMessageId: z.string().min(1).optional(),
});

export const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
