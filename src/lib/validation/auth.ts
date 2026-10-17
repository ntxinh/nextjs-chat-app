import { z } from "zod";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1).max(100),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
