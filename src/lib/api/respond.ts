import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });

export const apiError = (status: number, code: string, message: string, issues?: unknown) =>
  NextResponse.json(
    { error: { code, message, ...(issues === undefined ? {} : { issues }) } },
    { status },
  );

export function withError<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof AppError) return apiError(e.status, e.code, e.message);
      if (e instanceof z.ZodError)
        return apiError(400, "validation_error", "Invalid request", z.flattenError(e));
      return apiError(500, "internal_error", "Something went wrong");
    }
  };
}
