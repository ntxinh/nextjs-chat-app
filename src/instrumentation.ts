// OpenTelemetry registration lands in Task 27 — register() gets an OTel block here.
export async function register() {
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
}
