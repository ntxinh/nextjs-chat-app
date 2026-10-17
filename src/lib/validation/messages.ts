import { z } from "zod";

// 4000 mirrors the SQL CHECK on messages.body — keep the two in sync.
export const MESSAGE_BODY_MAX = 4000;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
  clientMessageId: z.string().min(8).max(64),
});

export const listMessagesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
