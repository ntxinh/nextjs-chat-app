export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    // Dynamic import: skip loading the OTel SDK entirely when the exporter isn't configured.
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "nextjs-chat-app" });
  }
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
}
