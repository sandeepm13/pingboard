import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  checkDiscordWebhook,
  checkSlackWebhook,
  maskChannelTarget,
} from "../src/lib/shared/alerts/channel-policy"
import { resolveChannel } from "../src/lib/shared/alerts/resolve-channel"
import { emailEnvSchema } from "../src/lib/shared/email/config"
import {
  createAlertChannelSchema,
  type AlertChannelFormValues,
} from "../src/lib/shared/schemas/alert-channel"

const DISCORD =
  "https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz_-0123456789"
// Fake URL, joined from parts so GitHub push protection doesn't flag it as a real webhook.
const SLACK = [
  "https://hooks.slack.com/services",
  "T0123ABCD",
  "B0456EFGH",
  "abcdEFGH1234ijklMNOP5678",
].join("/")
const TOKEN = "123456789:AAH-abcdefghijklmnopqrstuvwxyz0123456"

const blank: AlertChannelFormValues = {
  type: "email",
  name: "Ops",
  email: "",
  webhookUrl: "",
  botToken: "",
  chatId: "",
}

function errors(input: AlertChannelFormValues, editing = false) {
  const result = createAlertChannelSchema({ editing }).safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

describe("Discord webhook policy", () => {
  it("accepts real webhook URLs (and the other Discord hosts)", () => {
    assert.ok(checkDiscordWebhook(DISCORD).ok)
    assert.ok(
      checkDiscordWebhook(DISCORD.replace("discord.com", "discordapp.com")).ok
    )
    assert.ok(checkDiscordWebhook(DISCORD.replace("/api/", "/api/v10/")).ok)
    assert.ok(checkDiscordWebhook(`${DISCORD}?thread_id=42`).ok)
  })
  it("rejects anything that isn't Discord over https", () => {
    for (const url of [
      DISCORD.replace("https:", "http:"),
      DISCORD.replace("discord.com", "discord.com.evil.io"),
      DISCORD.replace("discord.com", "evil.io"),
      DISCORD.replace("discord.com", "127.0.0.1"),
      DISCORD.replace("https://", "https://user:pass@"),
      DISCORD.replace("discord.com", "discord.com:8443"),
      `${DISCORD}?wait=false&x=1`,
      "https://discord.com/api/users/@me",
      "not a url",
    ]) {
      assert.equal(checkDiscordWebhook(url).ok, false, url)
    }
  })
})

describe("Slack webhook policy", () => {
  it("accepts incoming-webhook URLs only", () => {
    assert.ok(checkSlackWebhook(SLACK).ok)
    assert.equal(
      checkSlackWebhook(SLACK.replace("hooks.slack.com", "slack.com")).ok,
      false
    )
    assert.equal(checkSlackWebhook(SLACK.replace("https:", "http:")).ok, false)
    assert.equal(
      checkSlackWebhook("https://hooks.slack.com/services/x").ok,
      false
    )
  })
})

describe("channel schema", () => {
  it("validates per type", () => {
    assert.deepEqual(errors({ ...blank, email: "me@example.com" }), [])
    assert.deepEqual(errors({ ...blank, email: "nope" }), ["email"])
    assert.deepEqual(
      errors({ ...blank, type: "discord", webhookUrl: DISCORD }),
      []
    )
    assert.deepEqual(errors({ ...blank, type: "discord", webhookUrl: SLACK }), [
      "webhookUrl",
    ])
    assert.deepEqual(errors({ ...blank, type: "slack", webhookUrl: SLACK }), [])
    assert.deepEqual(
      errors({
        ...blank,
        type: "telegram",
        botToken: TOKEN,
        chatId: "-1001234567890",
      }),
      []
    )
    assert.deepEqual(
      errors({
        ...blank,
        type: "telegram",
        botToken: TOKEN,
        chatId: "@my_channel",
      }),
      []
    )
    assert.deepEqual(
      errors({ ...blank, type: "telegram", botToken: "abc", chatId: "x y" }),
      ["botToken", "chatId"]
    )
    assert.deepEqual(errors({ ...blank, name: " ", email: "me@example.com" }), [
      "name",
    ])
  })

  it("on edit, a blank secret means keep the stored one", () => {
    assert.deepEqual(errors({ ...blank, type: "discord" }, true), [])
    assert.deepEqual(errors({ ...blank, type: "discord" }), ["webhookUrl"])
    assert.deepEqual(
      errors({ ...blank, type: "telegram", chatId: "42" }, true),
      []
    )
  })

  it("drops fields of other types", () => {
    const parsed = createAlertChannelSchema().parse({
      ...blank,
      type: "slack",
      webhookUrl: SLACK,
      email: "x@example.com",
      botToken: TOKEN,
    })
    assert.equal(parsed.email, null)
    assert.equal(parsed.botToken, null)
    assert.equal(parsed.webhookUrl, SLACK)
  })
})

describe("masking and resolving", () => {
  it("never shows the secret part", () => {
    const discord = maskChannelTarget({ type: "discord", webhookUrl: DISCORD })
    assert.equal(discord, "discord.com · webhook …5678")
    assert.ok(!discord.includes("AbCdEf"))
    const slack = maskChannelTarget({ type: "slack", webhookUrl: SLACK })
    assert.equal(slack, "hooks.slack.com · workspace T0123ABCD")
    assert.ok(!slack.includes("abcdEFGH"))
    assert.equal(
      maskChannelTarget({ type: "telegram", chatId: "42" }),
      "Chat 42"
    )
  })

  it("returns null instead of half a channel", () => {
    const decrypt = (value: string) => value.replace("enc:", "")
    assert.deepEqual(
      resolveChannel({ type: "discord", webhookUrl: "enc:u" }, decrypt),
      {
        type: "discord",
        webhookUrl: "u",
      }
    )
    assert.equal(
      resolveChannel({ type: "telegram", botToken: "enc:t" }, decrypt),
      null
    )
    assert.equal(
      resolveChannel({ type: "slack", webhookUrl: "enc:u" }, () => {
        throw new Error("bad key")
      }),
      null
    )
  })
})

describe("EMAIL_* settings", () => {
  it("defaults to the console provider", () => {
    assert.equal(emailEnvSchema.parse({}).provider, "console")
    assert.equal(
      emailEnvSchema.parse({ EMAIL_PROVIDER: "" }).provider,
      "console"
    )
  })
  it("requires the provider's credentials", () => {
    assert.equal(
      emailEnvSchema.safeParse({ EMAIL_PROVIDER: "resend" }).success,
      false
    )
    assert.equal(
      emailEnvSchema.safeParse({ EMAIL_PROVIDER: "smtp" }).success,
      false
    )
    const resend = emailEnvSchema.parse({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_x",
    })
    assert.equal(resend.from, "PingBoard <onboarding@resend.dev>")
  })
  it("derives SMTP defaults", () => {
    const smtp = emailEnvSchema.parse({
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_USER: "me@gmail.com",
      SMTP_PASS: "app-password",
    })
    assert.equal(smtp.provider === "smtp" && smtp.secure, true)
    assert.equal(smtp.from, "PingBoard <me@gmail.com>")
  })
})
