import { z } from "zod";

export const userSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
