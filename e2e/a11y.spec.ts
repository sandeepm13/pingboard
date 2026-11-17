import AxeBuilder from "@axe-core/playwright"
import type { Browser, Page } from "@playwright/test"
import { Types } from "mongoose"

import {
  createMonitor,
  db,
  expect,
  label,
  signUp,
  test,
  uniqueEmail,
} from "./helpers"

// Every page at 375 / 768 / 1024 / 1440 px: no horizontal scroll; axe
// (WCAG 2.1 A + AA, which includes colour contrast) at phone and desktop width
// in the default dark theme, and at desktop width in light; keyboard focus.

const WIDTHS = [375, 768, 1024, 1440] as const
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]

const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/docs",
  "/docs/monitors",
  "/docs/alerts",
  "/docs/status-pages",
  "/docs/status-badge",
  "/demo",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password?token=e2e",
  "/this-page-does-not-exist",
]

type Fixture = {
  storage: string
  monitorId: string
  incidentId: string
  statusPageId: string
  slug: string
}
let fixture: Fixture

test.beforeAll(async ({ browser }) => {
  test.setTimeout(90_000)
  const page = await browser.newPage({
    extraHTTPHeaders: { "x-forwarded-for": "198.51.100.77" },
  })
  const email = uniqueEmail("a11y")
  await signUp(page, email)
  const monitorId = await createMonitor(page, {
    name: "Marketing site",
    url: "https://example.com",
  })

  // A resolved incident, so the incident page has something to show.
  const database = await db()
  const user = await database.collection("users").findOne({ email })
  const started = new Date(Date.now() - 3 * 60 * 60_000)
  const { insertedId } = await database.collection("incidents").insertOne({
    monitorId: new Types.ObjectId(monitorId),
    userId: user!._id,
    open: false,
    startedAt: started,
    confirmedAt: new Date(started.getTime() + 60_000),
    resolvedAt: new Date(started.getTime() + 7 * 60_000),
    durationSeconds: 420,
    resolution: "recovered",
    cause: { statusCode: 503, errorMessage: "Unexpected status 503" },
    checksFailed: 7,
    lastFailureAt: new Date(started.getTime() + 6 * 60_000),
    notes: "",
    createdAt: started,
    updatedAt: started,
  })

  const slug = `a11y-${Date.now()}`
  await page.goto("/app/status-pages/new")
  await label(page, "Title").fill("Acme status")
  await label(page, "Address").fill(slug)
  await page.getByRole("switch", { name: "Public" }).click()
  await page.getByRole("button", { name: "Create status page" }).click()
  await page.waitForURL(/\/app\/status-pages\/[0-9a-f]{24}$/)
  const statusPageId = page.url().split("/").pop()!

  const storage = test.info().outputPath("a11y-user.json")
  await page.context().storageState({ path: storage })
  await page.close()
  fixture = {
    storage,
    monitorId,
    incidentId: insertedId.toString(),
    statusPageId,
    slug,
  }
})

function appPages(f: Fixture) {
  return [
    "/app",
    "/app/monitors/new",
    `/app/monitors/${f.monitorId}`,
    `/app/monitors/${f.monitorId}/edit`,
    "/app/incidents",
    `/app/incidents/${f.incidentId}`,
    "/app/status-pages",
    "/app/status-pages/new",
    `/app/status-pages/${f.statusPageId}`,
    `/app/status-pages/${f.statusPageId}/preview`,
    "/app/alerts",
    "/app/settings",
  ]
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  // Scroll through once so reveal-on-scroll content is in its final state.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 40))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  return results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`
  )
}

async function audit(page: Page, path: string) {
  const problems: string[] = []
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(path)
    await settle(page)
    const overflow = await horizontalOverflow(page)
    if (overflow > 0)
      problems.push(`${width}px: scrolls sideways by ${overflow}px`)
    if (width === 375 || width === 1440) {
      for (const v of await axe(page)) problems.push(`${width}px dark: ${v}`)
    }
  }
  // Light theme (next-themes keeps the choice in localStorage).
  await page.evaluate(() => localStorage.setItem("theme", "light"))
  await page.goto(path)
  await settle(page)
  for (const v of await axe(page)) problems.push(`1440px light: ${v}`)
  await page.evaluate(() => localStorage.removeItem("theme"))
  return problems
}

test.describe("public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`layout + axe ${path}`, async ({ page }) => {
      expect(await audit(page, path)).toEqual([])
    })
  }

  test("layout + axe public status page", async ({ page }) => {
    expect(await audit(page, `/status/${fixture.slug}`)).toEqual([])
  })
})

/**
 * A page logged in as the fixture user. Created here rather than with
 * test.use({ storageState }) so it always runs after beforeAll, also in the
 * fresh worker Playwright starts after a failed test.
 */
async function appPage(browser: Browser) {
  const context = await browser.newContext({ storageState: fixture.storage })
  return context.newPage()
}

test.describe("app pages", () => {
  test("layout + axe for every app page", async ({ browser }) => {
    test.setTimeout(6 * 60_000)
    const page = await appPage(browser)
    const problems: string[] = []
    for (const path of appPages(fixture)) {
      for (const problem of await audit(page, path))
        problems.push(`${path} ${problem}`)
    }
    expect(problems).toEqual([])
  })

  test("mobile navigation works with the keyboard", async ({ browser }) => {
    const page = await appPage(browser)
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto("/app")
    const open = page.getByRole("button", { name: "Open navigation" })
    await open.focus()
    await page.keyboard.press("Enter")
    const drawer = page.getByRole("dialog")
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole("link", { name: "Incidents" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(open).toBeFocused()
  })
})

/** Tabs through the page; every focused control must show a focus indicator. */
async function tabAndCheckFocus(page: Page, stops: number) {
  const missing: string[] = []
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Tab")
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const style = getComputedStyle(el)
      const ring =
        (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
        (style.boxShadow !== "none" && style.boxShadow !== "")
      return {
        ring,
        name: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`,
      }
    })
    if (info && !info.ring) missing.push(info.name)
  }
  return missing
}

test("keyboard: skip link first, visible focus on the landing page", async ({
  page,
}) => {
  await page.goto("/")
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: /skip to/i })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/#main$/)
  await page.goto("/")
  expect(await tabAndCheckFocus(page, 30)).toEqual([])
})

test.describe("keyboard in the app", () => {
  test("visible focus on the dashboard and monitor form", async ({
    browser,
  }) => {
    const page = await appPage(browser)
    for (const path of ["/app", "/app/monitors/new"]) {
      await page.goto(path)
      await settle(page)
      const missing = await tabAndCheckFocus(page, 25)
      expect(missing, path).toEqual([])
    }
  })
})
