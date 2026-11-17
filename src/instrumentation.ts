// Validates the server environment once at startup (see instrumentation-node),
// so a bad config stops the server before it serves a request. Skipped during
// `next build`, which runs without runtime secrets.
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node")
  }
}
