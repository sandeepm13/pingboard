import assert from "node:assert/strict"
import http from "node:http"
import type { AddressInfo } from "node:net"

import { afterAll, beforeAll, describe, it } from "vitest"

import { deliverAlert } from "../src/lib/shared/alerts/deliver"
import { DeliveryError } from "../src/lib/shared/alerts/errors"
import { postJson, type PostJson } from "../src/lib/shared/alerts/http"
import type { AlertMessage } from "../src/lib/shared/alerts/types"
import type { EmailConfig } from "../src/lib/shared/email/config"

const message: AlertMessage = {
  title: "🔴 API is DOWN",
  text: "🔴 API is DOWN — 503 Service Unavailable",
  fields: [],
  url: "https://pingboard.example/app/incidents/i1",
  linkLabel: "View incident",
  tone: "down",
}
const email: EmailConfig = { provider: "console", from: "PingBoard <x@y.z>" }
const SECRET = "SuperSecretWebhookToken_0123456789abcdef"
const DISCORD = `https://discord.com/api/webhooks/123456789012345678/${SECRET}`

function fake(status: number, text = "") {
  const calls: { url: string; body: unknown; hosts: readonly string[] }[] = []
  const post: PostJson = async (url, body, options) => {
    calls.push({ url, body, hosts: options.allowedHosts })
    return { status, text }
  }
  return { post, calls }
}

async function failure(promise: Promise<unknown>): Promise<DeliveryError> {
  try {
    await promise
  } catch (error) {
    assert.ok(error instanceof DeliveryError, String(error))
    return error
  }
  assert.fail("expected a DeliveryError")
}

const deps = (post: PostJson) => ({
  email,
  production: false,
  now: new Date(),
  postJson: post,
})

describe("deliverAlert", () => {
  it("Discord: posts with wait=true to the Discord hosts only", async () => {
    const { post, calls } = fake(200, "{}")
    await deliverAlert(
      { type: "discord", webhookUrl: DISCORD },
      message,
      deps(post)
    )
    assert.equal(calls.length, 1)
    assert.ok(calls[0]!.url.endsWith("?wait=true"))
    assert.ok(calls[0]!.hosts.includes("discord.com"))
  })

  it("Discord: a deleted webhook is permanent, 429/5xx are retried", async () => {
    const gone = await failure(
      deliverAlert(
        { type: "discord", webhookUrl: DISCORD },
        message,
        deps(fake(404, '{"message":"Unknown Webhook"}').post)
      )
    )
    assert.equal(gone.permanent, true)
    assert.ok(!gone.message.includes(SECRET))
    const limited = await failure(
      deliverAlert(
        { type: "discord", webhookUrl: DISCORD },
        message,
        deps(fake(429, "{}").post)
      )
    )
    assert.equal(limited.permanent, false)
    const down = await failure(
      deliverAlert(
        { type: "discord", webhookUrl: DISCORD },
        message,
        deps(fake(502).post)
      )
    )
    assert.equal(down.permanent, false)
  })

  it("Slack: 200 ok; no_service is permanent", async () => {
    await deliverAlert(
      { type: "slack", webhookUrl: "https://hooks.slack.com/services/T1/B1/x" },
      message,
      deps(fake(200, "ok").post)
    )
    const gone = await failure(
      deliverAlert(
        {
          type: "slack",
          webhookUrl: "https://hooks.slack.com/services/T1/B1/x",
        },
        message,
        deps(fake(404, "no_service").post)
      )
    )
    assert.equal(gone.permanent, true)
  })

  it("Telegram: needs ok:true; shows Telegram's description; never the token", async () => {
    const token = "123456789:AAH-abcdefghijklmnopqrstuvwxyz0123456"
    const ok = fake(200, '{"ok":true}')
    await deliverAlert(
      { type: "telegram", botToken: token, chatId: "42" },
      message,
      deps(ok.post)
    )
    assert.equal(
      ok.calls[0]!.url,
      `https://api.telegram.org/bot${token}/sendMessage`
    )
    assert.deepEqual((ok.calls[0]!.body as { chat_id: string }).chat_id, "42")

    const missing = await failure(
      deliverAlert(
        { type: "telegram", botToken: token, chatId: "42" },
        message,
        deps(
          fake(
            400,
            '{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}'
          ).post
        )
      )
    )
    assert.equal(missing.permanent, true)
    assert.match(missing.message, /chat not found/)
    assert.ok(!missing.message.includes(token))

    const badToken = await failure(
      deliverAlert(
        { type: "telegram", botToken: token, chatId: "42" },
        message,
        deps(fake(401, '{"ok":false}').post)
      )
    )
    assert.match(badToken.message, /bot token/)
  })

  it("email via the console provider prints to the logger", async () => {
    const lines: string[] = []
    await deliverAlert({ type: "email", email: "me@example.com" }, message, {
      ...deps(fake(200).post),
      log: (line) => lines.push(line),
    })
    assert.equal(lines.length, 1)
    const unset = await failure(
      deliverAlert({ type: "email", email: "me@example.com" }, message, {
        ...deps(fake(200).post),
        production: true,
      })
    )
    assert.equal(unset.permanent, true)
    assert.match(unset.message, /EMAIL_PROVIDER/)
    assert.match(lines[0]!, /to=me@example\.com subject="🔴 API is DOWN"/)
  })
})

describe("postJson (webhook HTTP)", () => {
  let server: http.Server
  let port = 0
  let received = 0

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      received++
      res.writeHead(200, { "content-type": "application/json" })
      res.end('{"ok":true}')
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    port = (server.address() as AddressInfo).port
  })
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it("refuses hosts outside the allow-list and plain http, before any request", async () => {
    for (const url of [
      "https://evil.example/api/webhooks/1/x",
      "http://discord.com/api/webhooks/1/x",
      `https://127.0.0.1:${port}/`,
    ]) {
      const error = await failure(
        postJson(url, {}, { allowedHosts: ["discord.com"] })
      )
      assert.equal(error.permanent, true)
    }
    assert.equal(received, 0)
  })

  it("refuses when DNS answers with a private address", async () => {
    const error = await failure(
      postJson(
        "https://discord.com/api/webhooks/1/x",
        {},
        {
          allowedHosts: ["discord.com"],
          guard: async () => ({
            ok: false,
            code: "blocked",
            reason: "private",
          }),
        }
      )
    )
    assert.match(error.message, /blocked address/)
    assert.equal(received, 0)
  })
})
