import { describe, expect, it } from "vitest"

import {
  slugify,
  statusPageInputSchema,
  statusPageSlugSchema,
} from "@shared/schemas/status-page"
import { DAY_MS, startOfUtcDay } from "@shared/stats"
import {
  overallStatus,
  toPublicStatusView,
  type StatusViewInput,
} from "@shared/status-page"

import { renderBadge } from "../src/lib/badge"
import { sniffImageType } from "../src/lib/image-type"

describe("overallStatus", () => {
  it("is operational when everything is up", () => {
    expect(overallStatus(["up", "up"])).toBe("operational")
  })
  it("is degraded when something is only slow", () => {
    expect(overallStatus(["up", "degraded"])).toBe("degraded")
  })
  it("is a partial outage when some (≤ half) are down", () => {
    expect(overallStatus(["up", "down"])).toBe("partial")
    expect(overallStatus(["up", "up", "degraded", "down"])).toBe("partial")
  })
  it("is a major outage when more than half are down", () => {
    expect(overallStatus(["down"])).toBe("major")
    expect(overallStatus(["down", "down", "up"])).toBe("major")
  })
  it("ignores paused and pending monitors", () => {
    expect(overallStatus(["paused", "pending", "up"])).toBe("operational")
    expect(overallStatus(["paused", "down"])).toBe("major")
  })
  it("is unknown with nothing to go on", () => {
    expect(overallStatus([])).toBe("unknown")
    expect(overallStatus(["paused", "pending"])).toBe("unknown")
  })
})

describe("status page slug", () => {
  const ok = (value: string) => statusPageSlugSchema.safeParse(value)

  it("accepts lowercase words with single dashes and normalises case", () => {
    expect(ok("acme").data).toBe("acme")
    expect(ok("acme-api-2").data).toBe("acme-api-2")
    expect(ok("  Acme ").data).toBe("acme")
  })
  it("rejects bad shapes", () => {
    for (const bad of [
      "ab",
      "-acme",
      "acme-",
      "ac--me",
      "ac me",
      "ac_me",
      "acmé",
      "a".repeat(41),
      "../etc",
      "acme.svg",
    ]) {
      expect(ok(bad).success, bad).toBe(false)
    }
  })
  it("rejects reserved addresses", () => {
    expect(ok("pingboard").success).toBe(false)
    expect(ok("admin").success).toBe(false)
  })
  it("slugify makes a usable starting point", () => {
    expect(slugify("Acme API!")).toBe("acme-api")
    expect(slugify("  Café — Status  ")).toBe("cafe-status")
  })
})

describe("statusPageInputSchema", () => {
  const base = {
    title: "Acme",
    slug: "acme",
    description: "",
    theme: "auto",
    showResponseTimes: false,
    showUrls: false,
    isPublic: true,
    monitors: [{ monitorId: "a".repeat(24), displayName: "API" }],
  }
  it("accepts a valid page", () => {
    expect(statusPageInputSchema.safeParse(base).success).toBe(true)
  })
  it("rejects a monitor listed twice and malformed ids", () => {
    const twice = { ...base, monitors: [...base.monitors, ...base.monitors] }
    expect(statusPageInputSchema.safeParse(twice).success).toBe(false)
    const badId = {
      ...base,
      monitors: [{ monitorId: "x", displayName: "API" }],
    }
    expect(statusPageInputSchema.safeParse(badId).success).toBe(false)
  })
  it("requires a public name", () => {
    const blank = {
      ...base,
      monitors: [{ monitorId: "a".repeat(24), displayName: "  " }],
    }
    expect(statusPageInputSchema.safeParse(blank).success).toBe(false)
  })
})

describe("toPublicStatusView", () => {
  const now = new Date("2026-10-27T12:00:00Z")
  const API = "64b000000000000000000001"
  const WEB = "64b000000000000000000002"
  const FOREIGN = "64b000000000000000000009"

  function input(
    overrides: Partial<StatusViewInput<string>["page"]> = {}
  ): StatusViewInput<string> {
    return {
      page: {
        slug: "acme",
        title: "Acme",
        description: "",
        logoUrl: null,
        theme: "dark",
        showUrls: false,
        showResponseTimes: false,
        monitors: [
          { monitorId: WEB, displayName: "Website" },
          { monitorId: FOREIGN, displayName: "Not mine" },
          { monitorId: API, displayName: "Public API" },
        ],
        announcements: [],
        ...overrides,
      },
      // Extra private fields ride along to prove they never get copied.
      monitors: new Map([
        [
          API,
          {
            status: "down",
            url: "https://internal.acme.dev/health?token=secret",
            errorMessage: "Connection refused",
            headers: [{ name: "Authorization", value: "Bearer secret" }],
          },
        ],
        [WEB, { status: "up", url: "https://acme.com" }],
      ] as [string, { status: "up" | "down"; url: string }][]),
      histories: new Map([
        [
          API,
          [
            { day: startOfUtcDay(now).getTime(), total: 4, up: 3, degraded: 0 },
            {
              day: startOfUtcDay(now).getTime() - DAY_MS,
              total: 4,
              up: 4,
              degraded: 1,
            },
          ],
        ],
      ]),
      incidents: [
        {
          monitorId: API,
          startedAt: new Date("2026-10-20T10:00:00Z"),
          resolvedAt: new Date("2026-10-20T10:07:00Z"),
          durationSeconds: 420,
          open: false,
        },
        {
          monitorId: API,
          startedAt: new Date("2026-10-27T11:50:00Z"),
          resolvedAt: null,
          durationSeconds: null,
          open: true,
        },
        // Resolved 20 days ago: outside the 14-day window.
        {
          monitorId: API,
          startedAt: new Date("2026-10-07T10:00:00Z"),
          resolvedAt: new Date("2026-10-07T11:00:00Z"),
          durationSeconds: 3600,
          open: false,
        },
        // A monitor that isn't on the page.
        {
          monitorId: FOREIGN,
          startedAt: new Date("2026-10-26T10:00:00Z"),
          resolvedAt: null,
          durationSeconds: null,
          open: true,
        },
      ],
      series: new Map([[API, "series-for-api"]]),
      branding: true,
      now,
    }
  }

  it("keeps the owner's order and skips monitors it doesn't own", () => {
    const view = toPublicStatusView(input())
    expect(view.services.map((s) => s.name)).toEqual(["Website", "Public API"])
    expect(view.overall).toBe("partial")
  })

  it("never leaks ids, URLs, errors or headers by default", () => {
    const json = JSON.stringify(toPublicStatusView(input()))
    for (const secret of [
      API,
      WEB,
      FOREIGN,
      "internal.acme.dev",
      "acme.com",
      "token",
      "Connection refused",
      "Authorization",
      "Bearer",
    ]) {
      expect(json, secret).not.toContain(secret)
    }
  })

  it("shows URLs and response series only when the owner allows it", () => {
    const view = toPublicStatusView(
      input({ showUrls: true, showResponseTimes: true })
    )
    expect(view.services[0]?.url).toBe("https://acme.com")
    expect(view.services[1]?.responseSeries).toBe("series-for-api")
    expect(toPublicStatusView(input()).services[1]?.responseSeries).toBeNull()
  })

  it("lists ongoing incidents first, then resolved ones from the last 14 days", () => {
    const { incidents } = toPublicStatusView(input())
    expect(incidents).toHaveLength(2)
    expect(incidents[0]).toMatchObject({
      ongoing: true,
      serviceName: "Public API",
    })
    expect(incidents[1]).toMatchObject({ ongoing: false, durationSeconds: 420 })
  })

  it("computes 90 daily slots and the 90-day uptime", () => {
    const api = toPublicStatusView(input()).services[1]
    expect(api?.slots).toHaveLength(90)
    expect(api?.slots.at(-1)?.status).toBe("down")
    expect(api?.slots.at(-2)?.status).toBe("degraded")
    expect(api?.uptime90d).toBe(87.5)
  })
})

describe("sniffImageType", () => {
  const bytes = (...values: number[]) => Uint8Array.from(values)
  const text = (value: string) => new TextEncoder().encode(value)

  it("recognises PNG, JPEG and WebP by their magic bytes", () => {
    expect(
      sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))
    ).toBe("image/png")
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg")
    expect(sniffImageType(text("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp")
  })
  it("rejects SVG, HTML, GIF and empty files", () => {
    expect(
      sniffImageType(
        text("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>")
      )
    ).toBeNull()
    expect(sniffImageType(text("<html><script>alert(1)</script>"))).toBeNull()
    expect(sniffImageType(text("GIF89a"))).toBeNull()
    expect(sniffImageType(bytes())).toBeNull()
  })
})

describe("renderBadge", () => {
  it("says up in green and down in red", () => {
    const up = renderBadge("operational")
    expect(up).toMatch(/^<svg /)
    expect(up).toContain(">up</text>")
    expect(up).toContain("#2ea043")
    expect(renderBadge("major")).toContain(">down</text>")
    expect(renderBadge("major")).toContain("#da3633")
  })
  it("escapes the label", () => {
    const svg = renderBadge("unknown", `<x onload="1">`)
    expect(svg).not.toContain("<x")
    expect(svg).toContain("&lt;x onload=&quot;1&quot;&gt;")
  })
})
