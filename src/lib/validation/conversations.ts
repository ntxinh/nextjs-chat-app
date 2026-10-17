import { z } from "zod";

export const listQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .meta({ id: "ListConversationsQuery" });

export const createConversationSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("direct"), userId: z.string().min(1) }),
    z.object({
      type: z.literal("group"),
      name: z.string().trim().min(1).max(100),
      memberIds: z.array(z.string().min(1)).max(100).default([]),
    }),
  ])
  .meta({ id: "CreateConversationRequest" });

export const renameConversationSchema = z
  .object({
    name: z.string().min(1).max(100),
  })
  .meta({ id: "RenameConversationRequest" });

export const addMemberSchema = z
  .object({
    userId: z.string().min(1),
  })
  .meta({ id: "AddMemberRequest" });

export const markReadSchema = z
  .object({
    messageId: z.string().min(1),
  })
  .meta({ id: "MarkReadRequest" });

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
