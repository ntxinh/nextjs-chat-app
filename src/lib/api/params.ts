import { z } from "zod";

/** Next 16 dynamic params are async: `schema.parse(await ctx.params)`. */
export const conversationParams = z.object({ conversationId: z.string() });
export const messageParams = z.object({ messageId: z.string() });
export const userParams = z.object({ userId: z.string() });
