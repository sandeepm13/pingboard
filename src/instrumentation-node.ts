import { getEnv } from "@/lib/env"

// Node.js runtime only (imported by instrumentation.ts). Exits on an invalid
// environment, e.g. SSRF_ALLOW_PRIVATE=true in production (CLAUDE.md §6).
try {
  getEnv()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
