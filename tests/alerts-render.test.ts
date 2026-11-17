import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  renderDiscord,
  renderSlack,
  renderTelegram,
} from "../src/lib/shared/alerts/render-chat"
import type { AlertMessage } from "../src/lib/shared/alerts/types"
import {
  alertEmail,
  passwordResetEmail,
} from "../src/lib/shared/email/templates"

// Monitor names are user input: none of these may ping, inject markup or break out.
const hostile: AlertMessage = {
  title: "🔴 @everyone <!channel> <script>alert(1)</script> is DOWN",
  text: "🔴 @everyone <!channel> & <b>x</b> is DOWN — 503 Service Unavailable",
  fields: [{ label: "Cause", value: '503 <Service> & "Unavailable"' }],
  url: "https://pingboard.example/app/incidents/i1",
  linkLabel: "View incident",
  tone: "down",
}
const now = new Date("2026-10-26T05:20:00Z")

describe("Discord", () => {
  it("builds one embed and never pings", () => {
    const body = renderDiscord(hostile, now)
    assert.deepEqual(body.allowed_mentions, { parse: [] })
    assert.equal(body.embeds.length, 1)
    const embed = body.embeds[0]!
    assert.equal(embed.url, hostile.url)
    assert.equal(embed.color, 0xe5484d)
    assert.equal(embed.timestamp, now.toISOString())
    assert.equal(embed.fields[0]?.name, "Cause")
  })
  it("respects Discord's length limits", () => {
    const long = { ...hostile, title: "x".repeat(400), text: "y".repeat(5000) }
    const embed = renderDiscord(long, now).embeds[0]!
    assert.equal(embed.title.length, 256)
    assert.equal(embed.description.length, 4096)
  })
})

describe("Slack", () => {
  it("escapes &, < and > so <!channel> can't notify", () => {
    const body = renderSlack(hostile)
    assert.ok(!body.text.includes("<!channel>"))
    assert.ok(body.text.includes("&lt;!channel&gt;"))
    const json = JSON.stringify(body.blocks)
    // plain_text (the header) never parses mentions; mrkdwn must be escaped.
    const mrkdwn = JSON.stringify(
      body.blocks.filter((block) => block.type === "section")
    )
    assert.ok(!mrkdwn.includes("<!channel>"))
    assert.ok(json.includes('"type":"header"'))
    assert.ok(json.includes('"type":"actions"'))
    assert.ok(json.includes(hostile.url))
  })
})

describe("Telegram", () => {
  it("escapes HTML", () => {
    const text = renderTelegram(hostile)
    assert.ok(!text.includes("<script>"))
    assert.ok(text.includes("&lt;script&gt;"))
    assert.ok(text.startsWith("<b>"))
    assert.ok(text.includes(`<a href="${hostile.url}">View incident →</a>`))
  })
  it("shows non-https links as text (Telegram rejects localhost anchors)", () => {
    const text = renderTelegram({
      ...hostile,
      url: "http://localhost:3000/app/incidents/i1",
    })
    assert.ok(!text.includes("<a href"))
    assert.ok(
      text.includes("View incident: http://localhost:3000/app/incidents/i1")
    )
  })
})

describe("emails", () => {
  it("alert email escapes user input and links to the page", () => {
    const email = alertEmail(hostile)
    assert.equal(email.subject, hostile.title)
    assert.ok(!email.html.includes("<script>"))
    assert.ok(email.html.includes("&lt;script&gt;"))
    assert.ok(email.html.includes(`href="${hostile.url}"`))
    assert.ok(email.text.includes(`View incident: ${hostile.url}`))
  })
  it("password reset email carries the link in html and text", () => {
    const link = "https://pingboard.example/reset-password?token=abc_DEF-123"
    const email = passwordResetEmail(link)
    assert.ok(email.html.includes(`href="${link}"`))
    assert.ok(email.text.includes(link))
  })
})
