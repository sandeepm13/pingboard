import { randomInt } from "node:crypto"

import { test as base, expect, type Locator, type Page } from "@playwright/test"
import mongoose from "mongoose"

import { E2E } from "../playwright.config"

// Each test gets its own fake client IP: the app rate-limits signups and the
// public checker per IP (x-forwarded-for), and one machine runs every test.
export const test = base.extend({
  // (Playwright's fixture callback is usually called `use`; renamed so the
  // React hooks lint rule doesn't mistake it for a hook.)
  extraHTTPHeaders: async ({}, provide) => {
    const ip = `198.51.100.${randomInt(1, 255)}`
    await provide({ "x-forwarded-for": ip })
  },
})

export { expect }

/**
 * A visible form field by its label. getByLabel also matches hidden copies:
 * while a streamed Suspense boundary resolves, React parks the new content in
 * a <div hidden> before swapping it in, so a form can briefly exist twice.
 */
export function label(
  scope: Page | Locator,
  text: string | RegExp,
  options: { exact?: boolean } = {}
) {
  return scope.getByLabel(text, options).filter({ visible: true })
}

export const PASSWORD = "correct-horse-battery-9"

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${randomInt(1_000, 9_999)}@example.com`
}

let connection: mongoose.Connection | null = null

/** The e2e database, for test fixtures (plan upgrades, seeded incidents). */
export async function db() {
  connection ??= await mongoose
    .createConnection(E2E.mongoUri, { dbName: E2E.mongoDb })
    .asPromise()
  return connection.db!
}

/** Nobody can buy Pro yet (no billing), so tests flip the plan in the DB. */
export async function setPlan(email: string, plan: "free" | "pro") {
  const database = await db()
  await database.collection("users").updateOne({ email }, { $set: { plan } })
}

/** Signs up through the UI and skips onboarding; ends on the dashboard. */
export async function signUp(page: Page, email: string, name = "E2E Tester") {
  await page.goto("/signup")
  await label(page, "Name").fill(name)
  await label(page, "Email").fill(email)
  await label(page, "Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL("**/onboarding")
  await page.getByRole("button", { name: "Skip for now" }).click()
  await page.waitForURL(/\/app$/)
}

export async function logIn(page: Page, email: string) {
  await page.goto("/login")
  await label(page, "Email").fill(email)
  await label(page, "Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: /^Log in$/ }).click()
  await page.waitForURL(/\/app/)
}

type NewMonitor = {
  name: string
  url: string
  everyMinute?: boolean
  keyword?: string
  header?: { name: string; value: string }
}

/** Creates a monitor through the form; returns its id. */
export async function createMonitor(page: Page, monitor: NewMonitor) {
  await page.goto("/app/monitors/new")
  await label(page, "Name", { exact: true }).fill(monitor.name)
  await label(page, "URL", { exact: true }).fill(monitor.url)
  if (monitor.everyMinute) {
    await page.getByRole("combobox", { name: "Check every" }).click()
    await page.getByRole("option", { name: "1 minute" }).click()
  }
  if (monitor.keyword || monitor.header) await openAdvanced(page)
  if (monitor.keyword) await label(page, /^Keyword/).fill(monitor.keyword)
  if (monitor.header) {
    await page.getByRole("button", { name: "Add header" }).click()
    await label(page, "Header 1 name").fill(monitor.header.name)
    await label(page, "Header 1 value").fill(monitor.header.value)
  }
  await page.getByRole("button", { name: "Create monitor" }).click()
  await page.waitForURL(/\/app\/monitors\/[0-9a-f]{24}$/)
  return page.url().split("/").pop()!
}

export async function openAdvanced(page: Page) {
  const toggle = page.getByRole("button", { name: /^Advanced/ })
  if ((await toggle.getAttribute("aria-expanded")) !== "true")
    await toggle.click()
}
