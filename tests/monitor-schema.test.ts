import assert from "node:assert/strict"
import { describe, it } from "vitest"

import {
  createMonitorInputSchema,
  type MonitorFormValues,
} from "../src/lib/shared/schemas/monitor"
import { parseStatusCodes } from "../src/lib/shared/status-codes"

const base: MonitorFormValues = {
  name: "API",
  url: "https://example.com/health",
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

const schema = createMonitorInputSchema()

function errorPaths(input: MonitorFormValues) {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."))
}

describe("monitor input schema", () => {
  it("accepts a minimal monitor and normalises it", () => {
    const result = schema.parse({
      ...base,
      tags: "Prod, api, prod",
      url: "example.com",
    })
    assert.equal(result.url, "https://example.com/")
    assert.deepEqual(result.tags, ["prod", "api"])
    assert.deepEqual(result.expectedStatusCodes, [{ from: 200, to: 299 }])
    assert.equal(result.body, null)
    assert.equal(result.keyword, null)
  })

  for (const url of [
    "http://localhost:3000",
    "http://192.168.1.10",
    "http://[::1]/",
    "http://2130706433/",
  ]) {
    it(`rejects private URL ${url}`, () => {
      assert.deepEqual(errorPaths({ ...base, url }), ["url"])
    })
  }

  it("rejects intervals that don't exist", () => {
    assert.deepEqual(
      errorPaths({
        ...base,
        intervalMinutes: 2 as MonitorFormValues["intervalMinutes"],
      }),
      ["intervalMinutes"]
    )
  })

  it("only keeps the body for POST", () => {
    assert.equal(schema.parse({ ...base, body: "{}" }).body, null)
    assert.equal(
      schema.parse({ ...base, method: "POST", body: "{}" }).body,
      "{}"
    )
  })

  it("rejects a keyword with HEAD", () => {
    assert.deepEqual(errorPaths({ ...base, method: "HEAD", keyword: "ok" }), [
      "keyword",
    ])
  })

  it("validates headers", () => {
    assert.deepEqual(
      errorPaths({ ...base, headers: [{ name: "Host", value: "evil" }] }),
      ["headers.0.name"]
    )
    assert.deepEqual(
      errorPaths({ ...base, headers: [{ name: "X-A", value: "a\r\nX-B: b" }] }),
      ["headers.0.value"]
    )
    assert.deepEqual(
      errorPaths({ ...base, headers: [{ name: "X-Key", value: "" }] }),
      ["headers.0.value"]
    )
    // Edit form: empty value + keepExisting means "keep the stored value".
    assert.deepEqual(
      errorPaths({
        ...base,
        headers: [{ name: "X-Key", value: "", keepExisting: true }],
      }),
      []
    )
    assert.deepEqual(
      errorPaths({
        ...base,
        headers: [
          { name: "X-Key", value: "1" },
          { name: "x-key", value: "2" },
        ],
      }),
      ["headers.1.name"]
    )
  })
})

describe("parseStatusCodes", () => {
  it("parses codes, ranges and families", () => {
    const parsed = parseStatusCodes("200-299, 301 4xx")
    assert.deepEqual(parsed, {
      ok: true,
      ranges: [
        { from: 200, to: 299 },
        { from: 301, to: 301 },
        { from: 400, to: 499 },
      ],
    })
  })

  for (const spec of ["", "abc", "299-200", "99", "600", "200-700"]) {
    it(`rejects ${JSON.stringify(spec)}`, () => {
      assert.equal(parseStatusCodes(spec).ok, false)
    })
  }
})
