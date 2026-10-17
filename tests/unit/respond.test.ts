import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError, ok, withError } from "@/lib/api/respond";
import { AppError } from "@/lib/errors/app-error";

describe("respond", () => {
  it("ok wraps data with the given status", async () => {
    const res = ok({ id: "u1" }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { id: "u1" } });
  });

  it("withError maps AppError to its envelope", async () => {
    const res = await withError(async () => {
      throw new AppError(401, "unauthorized", "Authentication required");
    })();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "unauthorized", message: "Authentication required" },
    });
  });

  it("withError maps ZodError to 400 validation_error with flattened issues", async () => {
    const res = await withError(async () => {
      z.object({ name: z.string().min(1) }).parse({ name: "" });
      throw new Error("unreachable");
    })();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("validation_error");
    expect(body.error.issues.fieldErrors.name).toBeTruthy();
  });

  it("withError maps unknown errors to 500 without leaking details", async () => {
    const res = await withError(async () => {
      throw new Error("secret db detail");
    })();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: "Something went wrong" } });
    expect(JSON.stringify(body)).not.toContain("secret db detail");
  });

  it("withError passes handler results through untouched", async () => {
    const res = await withError(async () => apiError(429, "rate_limited", "slow down"))();
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: { code: "rate_limited", message: "slow down" },
    });
  });
});
