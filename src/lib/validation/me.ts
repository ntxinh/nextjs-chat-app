import { z } from "zod";

export const patchMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    image: z.url().nullable().optional(),
  })
  .meta({ id: "PatchMeRequest" });

export type PatchMeInput = z.infer<typeof patchMeSchema>;
