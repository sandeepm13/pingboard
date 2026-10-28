import assert from "node:assert/strict"

import { describe, it } from "vitest"

import { isChannelTypeAllowed, PLAN_LIMITS } from "../src/lib/shared/plans"
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema,
} from "../src/lib/shared/schemas/account"
import { tryCheckSchema } from "../src/lib/shared/schemas/monitor"
import { currentZoneName } from "../src/lib/shared/time"

describe("currentZoneName", () => {
  it("maps old zone names to current ones", () => {
    assert.equal(currentZoneName("Asia/Calcutta"), "Asia/Kolkata")
    assert.equal(currentZoneName("Europe/Kiev"), "Europe/Kyiv")
    assert.equal(currentZoneName("Asia/Katmandu"), "Asia/Kathmandu")
  })

  it("leaves current and unknown names alone", () => {
    assert.equal(currentZoneName("Europe/Berlin"), "Europe/Berlin")
    assert.equal(currentZoneName("UTC"), "UTC")
    assert.equal(currentZoneName("Not/AZone"), "Not/AZone")
  })
})

describe("plan channel types", () => {
  it("Free alerts by email only; Pro has every channel", () => {
    assert.equal(isChannelTypeAllowed("free", "email"), true)
    for (const type of ["discord", "slack", "telegram"] as const) {
      assert.equal(isChannelTypeAllowed("free", type), false)
      assert.equal(isChannelTypeAllowed("pro", type), true)
    }
    assert.deepEqual(PLAN_LIMITS.free.alertChannelTypes, ["email"])
  })
})

describe("account schemas", () => {
  it("profile needs a name and a real time zone (no silent UTC fallback)", () => {
    assert.equal(
      profileSchema.safeParse({ name: "Ann", timezone: "Asia/Kolkata" })
        .success,
      true
    )
    assert.equal(
      profileSchema.safeParse({ name: "  ", timezone: "UTC" }).success,
      false
    )
    assert.equal(
      profileSchema.safeParse({ name: "Ann", timezone: "Mars/Olympus" })
        .success,
      false
    )
  })

  it("password change: length, 72-byte cap, confirmation", () => {
    const ok = {
      currentPassword: "old",
      newPassword: "long-enough",
      confirmPassword: "long-enough",
    }
    assert.equal(changePasswordSchema.safeParse(ok).success, true)
    assert.equal(
      changePasswordSchema.safeParse({ ...ok, confirmPassword: "nope" })
        .success,
      false
    )
    assert.equal(
      changePasswordSchema.safeParse({
        ...ok,
        newPassword: "short",
        confirmPassword: "short",
      }).success,
      false
    )
    const long = "é".repeat(40) // 80 bytes
    assert.equal(
      changePasswordSchema.safeParse({
        ...ok,
        newPassword: long,
        confirmPassword: long,
      }).success,
      false
    )
  })

  it("delete confirmation email is normalised like login emails", () => {
    const parsed = deleteAccountSchema.parse({
      confirmEmail: "  Ann@Example.COM ",
      password: "",
    })
    assert.equal(parsed.confirmEmail, "ann@example.com")
  })
})

describe("tryCheckSchema (anonymous checks)", () => {
  it("accepts public URLs and adds https to bare hosts", () => {
    assert.equal(
      tryCheckSchema.parse({ url: "example.com/health" }).url,
      "https://example.com/health"
    )
  })

  it("refuses private, metadata and non-http targets", () => {
    for (const url of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data",
      "http://localhost:3000",
      "http://[::1]/",
      "http://0x7f000001/",
      "ftp://example.com",
      "https://user:pass@example.com",
    ]) {
      assert.equal(tryCheckSchema.safeParse({ url }).success, false, url)
    }
  })
})
