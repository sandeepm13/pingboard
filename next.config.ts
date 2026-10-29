import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"
const httpsSite = (process.env.APP_URL ?? "").startsWith("https://")

// Static CSP (no nonces): nonces would make every page dynamic, which Cache
// Components / partial prerendering can't do. Next's inline bootstrap scripts
// and next-themes need 'unsafe-inline'; React style props need it for styles.
// Images allow any https host for Google/GitHub avatars. form-action lists the
// OAuth providers because a pre-hydration sign-in POST redirects to them.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://github.com",
  "frame-ancestors 'none'",
  ...(httpsSite ? ["upgrade-insecure-requests"] : []),
].join("; ")

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(httpsSite
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
]

const nextConfig: NextConfig = {
  // Docker: .next/standalone holds server.js + only the traced node_modules.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Route handlers that serve images set their own, stricter CSP.
      {
        source: "/((?!api/|_next/static|_next/image).*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ]
  },
}

export default nextConfig
