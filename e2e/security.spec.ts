import {
  createMonitor,
  expect,
  label,
  logIn,
  PASSWORD,
  setPlan,
  signUp,
  test,
  uniqueEmail,
} from "./helpers"

// SSRF on every entry point, ownership, rate limits, headers and secrets,
// through the real UI and HTTP endpoints of a production build.

/** Internal targets. localtest.me is a public name whose DNS answer is 127.0.0.1. */
const BLOCKED = [
  "http://localhost:3000",
  "http://127.0.0.1/",
  "http://10.0.0.1/",
  "http://192.168.1.1/",
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/",
  "http://localtest.me/",
]

const REFUSED = /private|internal|not allowed|isn't allowed|can't be/i

test.describe("SSRF", () => {
  test("landing page checker refuses internal targets", async ({ page }) => {
    await page.goto("/")
    const form = page.locator("form", { has: label(page, "URL to check") })
    // Field errors show in the form, server answers in the card around it.
    const card = form.locator("..")
    for (const url of BLOCKED) {
      await label(form, "URL to check").fill(url)
      await form.getByRole("button", { name: /Check it/ }).click()
      await expect(card, url).toContainText(REFUSED)
      await expect(card, url).not.toContainText("Up right now")
    }
  })

  test("monitor form refuses internal targets on save and on Test now", async ({
    page,
  }) => {
    await signUp(page, uniqueEmail("ssrf"))
    await page.goto("/app/monitors/new")
    await label(page, "Name", { exact: true }).fill("Internal")
    for (const url of BLOCKED) {
      await label(page, "URL", { exact: true }).fill(url)
      await page.getByRole("button", { name: "Test now" }).click()
      await expect(page.locator("form"), `Test now ${url}`).toContainText(
        REFUSED
      )
      await page.getByRole("button", { name: "Create monitor" }).click()
      await expect(page.locator("form"), `save ${url}`).toContainText(REFUSED)
      await expect(page).toHaveURL(/\/app\/monitors\/new$/)
    }
    // Nothing was created.
    await page.goto("/app")
    await expect(page.locator("main")).not.toContainText("Internal")
  })
})

test.describe("ownership", () => {
  test("another user's monitor is not found, and absent from their API", async ({
    page,
    browser,
  }) => {
    await signUp(page, uniqueEmail("owner-a"))
    const id = await createMonitor(page, {
      name: "A's private API",
      url: "https://example.com",
    })

    const other = await browser.newPage({
      extraHTTPHeaders: { "x-forwarded-for": "198.51.100.250" },
    })
    await signUp(other, uniqueEmail("owner-b"))
    for (const path of [`/app/monitors/${id}`, `/app/monitors/${id}/edit`]) {
      await other.goto(path)
      await expect(other.locator("main"), path).toContainText("Not found")
      await expect(other.locator("main"), path).not.toContainText(
        "A's private API"
      )
    }
    const api = await other.request.get("/api/dashboard")
    expect(api.status()).toBe(200)
    expect(await api.text()).not.toContain(id)
    await other.close()
  })

  test("APIs need a session", async ({ request }) => {
    const response = await request.get("/api/dashboard")
    expect(response.status()).toBe(401)
  })
})

test.describe("rate limits", () => {
  test("Test now: 10 a minute per user", async ({ page }) => {
    await signUp(page, uniqueEmail("rl-test"))
    await page.goto("/app/monitors/new")
    // Refused quickly by the server's DNS check, but each click still counts.
    await label(page, "URL", { exact: true }).fill("http://localtest.me/")
    const button = page.getByRole("button", { name: "Test now" })
    for (let i = 0; i < 10; i++) {
      await button.click()
      await expect(page.locator("form")).toContainText(REFUSED)
    }
    await button.click()
    await expect(page.locator("form")).toContainText("That's a lot of tests")
  })

  test("login: 8 attempts per email per 15 minutes", async ({ page }) => {
    const email = uniqueEmail("rl-login")
    await signUp(page, email)
    await page.context().clearCookies()
    for (let i = 0; i < 8; i++) {
      await page.goto("/login")
      await label(page, "Email").fill(email)
      await label(page, "Password", { exact: true }).fill("wrong-password-123")
      await page.getByRole("button", { name: /^Log in$/ }).click()
      await expect(page.getByRole("alert").first()).toBeVisible()
    }
    await page.goto("/login")
    await label(page, "Email").fill(email)
    // Even the right password is refused while limited.
    await label(page, "Password", { exact: true }).fill(PASSWORD)
    await page.getByRole("button", { name: /^Log in$/ }).click()
    await expect(page.getByRole("alert").first()).toContainText(/too many/i)
  })

  test("landing checker: 5 per 10 minutes per IP", async ({ page }) => {
    await page.goto("/")
    const form = page.locator("form", { has: label(page, "URL to check") })
    const result = form.locator("..").locator('[aria-live="polite"]')
    for (let i = 0; i < 5; i++) {
      await label(form, "URL to check").fill(`http://localtest.me/${i}`)
      await form.getByRole("button", { name: /Check it/ }).click()
      await expect(result).toContainText(`localtest.me/${i}`)
      await expect(result).toContainText(REFUSED)
    }
    await label(form, "URL to check").fill("http://localtest.me/again")
    await form.getByRole("button", { name: /Check it/ }).click()
    await expect(result).toContainText("That's a lot of checks")
  })
})

test.describe("secrets never reach the browser", () => {
  test("monitor header values and webhook URLs", async ({ page }) => {
    const email = uniqueEmail("secrets")
    await signUp(page, email)
    const token = `Bearer e2e-secret-${Date.now()}`
    const id = await createMonitor(page, {
      name: "With token",
      url: "https://example.com",
      header: { name: "Authorization", value: token },
    })
    for (const path of [
      `/app/monitors/${id}`,
      `/app/monitors/${id}/edit`,
      "/app",
    ]) {
      await page.goto(path)
      expect(await page.content(), path).not.toContain(token)
    }
    await expect(
      page.request.get("/api/dashboard").then((r) => r.text())
    ).resolves.not.toContain(token)
    await page.goto(`/app/monitors/${id}/edit`)
    await expect(label(page, "Header 1 value")).toHaveValue("")

    // Discord needs Pro.
    await setPlan(email, "pro")
    const secretPart = `e2eSecret${Date.now()}`
    await page.goto("/app/alerts")
    await page
      .getByRole("button", { name: /add channel/i })
      .first()
      .click()
    const dialog = page.getByRole("dialog")
    // Native radio inside a tile label (the input itself is sr-only).
    await dialog.getByText("Discord", { exact: true }).click()
    await expect(dialog.getByRole("radio", { name: "Discord" })).toBeChecked()
    await label(dialog, /^Name/).fill("Team Discord")
    await label(dialog, /Webhook URL/i).fill(
      `https://discord.com/api/webhooks/123456789/${secretPart}`
    )
    await dialog.getByRole("button", { name: /^(Add|Save)/ }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    await expect(page.locator("main")).toContainText("Team Discord")
    expect(await page.content()).not.toContain(secretPart)
  })

  test("every form posts, so a submit before hydration can't leak values", async ({
    page,
  }) => {
    // Streamed forms become visible (inline reveal script) before React
    // hydrates; a click in between submits natively, and a GET form would put
    // every field (passwords, header tokens, webhook URLs) in the URL,
    // history and server logs. Checked on the server-rendered HTML.
    async function formMethods(path: string) {
      const html = await (await page.request.get(path)).text()
      return [...html.matchAll(/<form\b[^>]*>/g)].map(([tag]) => ({
        path,
        post: /\smethod="post"/i.test(tag),
      }))
    }
    const publicForms = (
      await Promise.all(
        [
          "/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password?token=x",
        ].map(formMethods)
      )
    ).flat()

    await signUp(page, uniqueEmail("forms"))
    const id = await createMonitor(page, {
      name: "Forms",
      url: "https://example.com",
    })
    const appForms = (
      await Promise.all(
        [
          "/onboarding",
          "/app/monitors/new",
          `/app/monitors/${id}/edit`,
          "/app/status-pages/new",
          "/app/settings",
        ].map(formMethods)
      )
    ).flat()

    const forms = [...publicForms, ...appForms]
    expect(forms.length).toBeGreaterThanOrEqual(8)
    expect(forms.filter((form) => !form.post)).toEqual([])
  })
})

test.describe("headers and pages", () => {
  test("security headers on pages", async ({ request }) => {
    const response = await request.get("/")
    const headers = response.headers()
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    )
    expect(headers["content-security-policy"]).toContain("object-src 'none'")
    expect(headers["x-frame-options"]).toBe("DENY")
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(headers["permissions-policy"]).toContain("camera=()")
    expect(headers["x-powered-by"]).toBeUndefined()
  })

  test("friendly 404 and no public styleguide", async ({ page }) => {
    const missing = await page.goto("/this-page-does-not-exist")
    expect(missing?.status()).toBe(404)
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Go to the home page" })
    ).toBeVisible()

    const styleguide = await page.goto("/styleguide")
    expect(styleguide?.status()).toBe(404)
  })

  test("logging in again after the limits still works for a fresh user", async ({
    page,
  }) => {
    const email = uniqueEmail("relogin")
    await signUp(page, email)
    await page.context().clearCookies()
    await logIn(page, email)
    await expect(page).toHaveURL(/\/app$/)
  })
})
