import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  runHttpCheck,
  type HttpCheckRequest,
} from "../src/lib/shared/checks/http-check"
import {
  createMonitorInputSchema,
  createMonitorTestSchema,
  tryCheckSchema,
  type MonitorFormValues,
} from "../src/lib/shared/schemas/monitor"
import {
  resolvePublicTarget,
  type LookupFn,
} from "../src/lib/shared/security/ssrf"

// Every way a user can make our server send a request, against the same list
// of internal targets: saving a monitor (Zod in the form + server action, then
// the DNS check in validateMonitor), "Test now" (Zod + runHttpCheck) and the
// anonymous landing-page checker (tryCheckSchema + runHttpCheck). The worker
// runs runHttpCheck too, so a target that slipped past a save is still refused.

const LITERALS = [
  "http://localhost/",
  "http://localhost:8080/admin",
  "http://127.0.0.1/",
  "http://10.0.0.5/",
  "http://10.255.255.255:8443/",
  "http://192.168.1.1/",
  "http://172.16.0.1/",
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]/",
  "http://[::ffff:127.0.0.1]/",
  "http://0.0.0.0/",
  "http://2130706433/", // 127.0.0.1 as a decimal integer
  "http://0x7f.0.0.1/",
]

/** Public-looking names whose DNS answer points inside. */
const PRIVATE_DNS: [string, string[]][] = [
  ["http://loopback.attacker.example/", ["127.0.0.1"]],
  ["http://ten.attacker.example/", ["10.0.0.5"]],
  ["http://home.attacker.example/", ["192.168.1.1"]],
  ["http://metadata.attacker.example/", ["169.254.169.254"]],
  ["http://v6.attacker.example/", ["::1"]],
  ["http://mixed.attacker.example/", ["93.184.215.14", "10.0.0.1"]],
]

function fakeDns(addresses: string[]): LookupFn {
  return async () =>
    addresses.map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    }))
}

/** DNS must not even be asked for a refused literal. */
const noDns: LookupFn = async () => {
  throw new Error("DNS was queried for a literal that should be refused")
}

function checkRequest(url: string): HttpCheckRequest {
  return {
    url,
    method: "GET",
    headers: [],
    body: null,
    timeoutMs: 2_000,
    expectedStatusCodes: [{ from: 200, to: 299 }],
    keyword: null,
    followRedirects: true,
  }
}

const monitorForm: MonitorFormValues = {
  name: "Target",
  url: "",
  intervalMinutes: 5,
  tags: "",
  method: "GET",
  timeoutMs: 10_000,
  expectedStatusCodes: "200-299",
  headers: [],
  body: "",
  keyword: "",
  followRedirects: true,
  alertAllChannels: true,
  alertChannelIds: [],
  alertOnDegraded: false,
}

function urlRejected(result: {
  success: boolean
  error?: { issues: { path: PropertyKey[] }[] }
}) {
  return (
    !result.success &&
    result.error!.issues.some((issue) => issue.path[0] === "url")
  )
}

describe("SSRF: internal literals are refused everywhere", () => {
  for (const url of LITERALS) {
    it(url, async () => {
      const input = { ...monitorForm, url }
      assert.ok(
        urlRejected(createMonitorInputSchema().safeParse(input)),
        "monitor save"
      )
      assert.ok(
        urlRejected(createMonitorTestSchema().safeParse(input)),
        "Test now"
      )
      assert.ok(
        urlRejected(tryCheckSchema.safeParse({ url })),
        "landing checker"
      )

      // Defence in depth: the check runner refuses it even without the schema.
      const check = await runHttpCheck(checkRequest(url), { lookup: noDns })
      assert.equal(check.isUp, false)
      assert.equal(check.statusCode, null)
      assert.match(
        check.errorMessage ?? "",
        /private or internal|not allowed|invalid/i
      )
    })
  }
})

describe("SSRF: names that resolve to internal addresses are refused", () => {
  for (const [url, answer] of PRIVATE_DNS) {
    it(`${url} → ${answer.join(", ")}`, async () => {
      // The name itself looks public, so the sync schemas let it through…
      assert.equal(tryCheckSchema.safeParse({ url }).success, true)

      // …and the DNS step refuses it: on save (validateMonitor)…
      const guard = await resolvePublicTarget(url, { lookup: fakeDns(answer) })
      assert.equal(guard.ok, false)

      // …and on every check: Test now, the landing checker and the worker.
      const check = await runHttpCheck(checkRequest(url), {
        lookup: fakeDns(answer),
        allowPrivate: false,
      })
      assert.equal(check.isUp, false)
      assert.equal(check.statusCode, null)
      assert.match(check.errorMessage ?? "", /private or internal/)
    })
  }
})
