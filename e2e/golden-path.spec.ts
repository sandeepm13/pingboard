import {
  createMonitor,
  expect,
  label,
  openAdvanced,
  setPlan,
  signUp,
  test,
  uniqueEmail,
} from "./helpers"

// Sign up → add a monitor → see its first check → it goes down → an incident
// appears → the public status page shows the outage. Runs against the real
// worker; https://example.com is the monitored site (its page always says
// "Example Domain", so a keyword we know is missing takes it "down").

test("golden path: sign up to public outage", async ({ page, browser }) => {
  test.setTimeout(5 * 60_000)
  const email = uniqueEmail("golden")
  const name = `Example ${Date.now()}`

  await signUp(page, email)
  // 1-minute checks are a Pro feature; nobody can buy Pro yet.
  await setPlan(email, "pro")

  const id = await createMonitor(page, {
    name,
    url: "https://example.com",
    everyMinute: true,
    keyword: "Example Domain",
  })

  // A new monitor is checked straight away.
  const header = page.locator("h1", { hasText: name }).locator("..")
  await expect(async () => {
    await page.reload()
    await expect(header).toContainText("Up", { timeout: 2_000 })
  }).toPass({ timeout: 60_000, intervals: [3_000] })
  const lastStatus = page.locator("div.rounded-xl", {
    has: page.getByText("Last status", { exact: true }),
  })
  await expect(lastStatus).toContainText("200")

  // Break it: a keyword the page doesn't contain. Changing the URL as well
  // re-checks at once; the second failure (a minute later) makes it "down".
  await page.goto(`/app/monitors/${id}/edit`)
  await label(page, "URL", { exact: true }).fill(
    "https://example.com/?e2e=down"
  )
  await openAdvanced(page)
  await label(page, /^Keyword/).fill("pingboard-e2e-missing-keyword")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.waitForURL(new RegExp(`/app/monitors/${id}$`))

  // The dashboard follows on its own (30 s polling), down monitors first.
  await page.goto("/app")
  const row = page.getByRole("link", { name: new RegExp(name) }).first()
  await expect(row).toBeVisible()
  // No reload: the open dashboard picks it up by polling.
  await expect(page).toHaveTitle(/\(1 down\)/, { timeout: 180_000 })
  await expect(page.locator("li", { has: row })).toContainText("Down")

  // The incident, with the reason.
  await page.goto("/app/incidents")
  const incident = page.locator("main")
  await expect(incident).toContainText(name)
  await expect(incident).toContainText("Ongoing")
  await expect(incident).toContainText("Keyword not found")

  // A public status page with this monitor shows the outage to anyone.
  const slug = `golden-${Date.now()}`
  await page.goto("/app/status-pages/new")
  await label(page, "Title").fill("Golden Path Co")
  await label(page, "Address").fill(slug)
  await page.getByRole("switch", { name: "Public" }).click()
  await page.getByRole("button", { name: "Create status page" }).click()
  await page.waitForURL(/\/app\/status-pages\/[0-9a-f]{24}$/)

  const visitor = await browser.newPage()
  await visitor.goto(`/status/${slug}`)
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText(
    "Golden Path Co"
  )
  await expect(visitor.locator("body")).toContainText(/major outage/i)
  await expect(visitor.locator("body")).toContainText(name)
  // Only the whitelist reaches visitors: no URL, no error text.
  const html = await visitor.content()
  expect(html).not.toContain("example.com")
  expect(html).not.toContain("Keyword not found")
  await visitor.close()
})
