import assert from "node:assert/strict"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { gzipSync } from "node:zlib"

import { afterAll, beforeAll, describe, it } from "vitest"

import {
  runHttpCheck,
  type HttpCheckOptions,
  type HttpCheckRequest,
} from "../src/lib/shared/checks/http-check"
import {
  resolvePublicTarget,
  type GuardResult,
  type LookupFn,
} from "../src/lib/shared/security/ssrf"

// Local servers stand in for "public" sites: the test guard maps the made-up
// hosts app.test / other.test to 127.0.0.1 and sends everything else through
// the real SSRF guard, so redirect hops are judged exactly as in production.

let app: Server
let other: Server
let appPort = 0
let otherPort = 0

function listen(server: Server) {
  return new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve((server.address() as AddressInfo).port)
    )
  })
}

beforeAll(async () => {
  other = createServer((req, res) => {
    res.end(req.headers.authorization ? "auth=present" : "auth=none")
  })
  otherPort = await listen(other)

  app = createServer((req, res) => {
    switch (req.url) {
      case "/ok":
        return res.end("hello world")
      case "/500":
        res.statusCode = 500
        return res.end("boom")
      case "/503":
        res.statusCode = 503
        return res.end("busy")
      case "/slow":
        return setTimeout(() => res.end("slow hello"), 250)
      case "/gzip":
        res.setHeader("content-encoding", "gzip")
        return res.end(gzipSync("compressed hello"))
      case "/big":
        // 2 MB of "a", then the keyword: past the 1 MB read cap.
        res.write("a".repeat(2 * 1024 * 1024))
        return res.end("needle")
      case "/post":
        if (req.method !== "POST") {
          res.statusCode = 405
          return res.end()
        }
        return req.on("data", () => {}).on("end", () => res.end("posted"))
      case "/redirect-ok":
        res.writeHead(302, { location: "/ok" })
        return res.end()
      case "/redirect-private":
        res.writeHead(302, { location: "http://10.0.0.1/" })
        return res.end()
      case "/redirect-localhost":
        res.writeHead(301, { location: "http://localhost/admin" })
        return res.end()
      case "/redirect-metadata":
        res.writeHead(307, { location: "http://169.254.169.254/latest/" })
        return res.end()
      case "/redirect-other":
        res.writeHead(302, { location: `http://other.test:${otherPort}/` })
        return res.end()
      case "/loop":
        res.writeHead(302, { location: "/loop" })
        return res.end()
      case "/echo-auth":
        return res.end(req.headers.authorization ? "auth=present" : "auth=none")
      case "/hang":
        return // never responds
      default:
        res.statusCode = 404
        res.end()
    }
  })
  appPort = await listen(app)
})

afterAll(() => {
  app.closeAllConnections()
  other.closeAllConnections()
  app.close()
  other.close()
})

async function testGuard(url: string): Promise<GuardResult> {
  const parsed = new URL(url)
  if (["app.test", "other.test", "rebind.test"].includes(parsed.hostname)) {
    return {
      ok: true,
      target: {
        url: parsed,
        hostname: parsed.hostname,
        address: "127.0.0.1",
        family: 4,
      },
    }
  }
  return resolvePublicTarget(url)
}

function request(
  url: string,
  overrides: Partial<HttpCheckRequest> = {}
): HttpCheckRequest {
  return {
    url,
    method: "GET",
    headers: [],
    body: null,
    timeoutMs: 2_000,
    expectedStatusCodes: [{ from: 200, to: 299 }],
    keyword: null,
    followRedirects: true,
    ...overrides,
  }
}

function check(
  path: string,
  overrides: Partial<HttpCheckRequest> = {},
  options: HttpCheckOptions = {}
) {
  return runHttpCheck(request(`http://app.test:${appPort}${path}`, overrides), {
    guard: testGuard,
    ...options,
  })
}

/** A resolver that answers every name with these addresses. */
function fakeDns(...addresses: string[]): LookupFn {
  return async () =>
    addresses.map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    }))
}

describe("runHttpCheck: up", () => {
  it("200 OK is up, with status code and response time", async () => {
    const result = await check("/ok")
    assert.equal(result.status, "up")
    assert.equal(result.isUp, true)
    assert.equal(result.statusCode, 200)
    assert.equal(typeof result.responseTimeMs, "number")
    assert.ok((result.responseTimeMs ?? -1) >= 0)
    assert.equal(result.errorMessage, null)
    assert.ok(result.checkedAt instanceof Date)
  })

  it("accepts custom expected status codes", async () => {
    const result = await check("/503", {
      expectedStatusCodes: [{ from: 503, to: 503 }],
    })
    assert.equal(result.status, "up")
  })

  it("sends the method and body (POST)", async () => {
    const result = await check("/post", {
      method: "POST",
      body: '{"ping":true}',
      keyword: "posted",
    })
    assert.equal(result.status, "up")
  })

  it("connects to the pinned IP without consulting DNS (anti-rebinding)", async () => {
    // rebind.test doesn't exist in DNS; success proves the pinned address was used.
    const result = await runHttpCheck(
      request(`http://rebind.test:${appPort}/ok`, { followRedirects: false }),
      { guard: testGuard }
    )
    assert.equal(result.isUp, true)
  })
})

describe("runHttpCheck: degraded and timeouts", () => {
  it("a slow but correct response is degraded (still up)", async () => {
    const result = await check("/slow", {}, { slowThresholdMs: 100 })
    assert.equal(result.status, "degraded")
    assert.equal(result.isUp, true)
    assert.ok((result.responseTimeMs ?? 0) > 100)
  })

  it("the same response under the threshold is up", async () => {
    const result = await check("/slow", {}, { slowThresholdMs: 5_000 })
    assert.equal(result.status, "up")
  })

  it("no answer within the timeout is down: 'Timeout after …'", async () => {
    const started = performance.now()
    const result = await check("/hang", { timeoutMs: 300 })
    assert.equal(result.status, "down")
    assert.equal(result.statusCode, null)
    assert.equal(result.responseTimeMs, null)
    assert.equal(result.errorMessage, "Timeout after 0.3s")
    assert.ok(performance.now() - started < 1_500)
  })

  it("formats whole seconds without decimals", async () => {
    const result = await check("/hang", { timeoutMs: 1_000 })
    assert.equal(result.errorMessage, "Timeout after 1s")
  })
})

describe("runHttpCheck: down", () => {
  it("500 is down: 'Unexpected status 500'", async () => {
    const result = await check("/500")
    assert.equal(result.status, "down")
    assert.equal(result.isUp, false)
    assert.equal(result.statusCode, 500)
    assert.equal(typeof result.responseTimeMs, "number")
    assert.equal(result.errorMessage, "Unexpected status 500")
  })

  it("keyword missing is down: 'Keyword not found'", async () => {
    const missing = await check("/ok", { keyword: "missing" })
    assert.equal(missing.status, "down")
    assert.equal(missing.statusCode, 200)
    assert.equal(missing.errorMessage, "Keyword not found")
  })

  it("checks keywords case-insensitively, also in gzip bodies", async () => {
    assert.equal((await check("/ok", { keyword: "HELLO" })).isUp, true)
    assert.equal((await check("/gzip", { keyword: "compressed" })).isUp, true)
  })

  it("reads only the first 1 MB of the body", async () => {
    const result = await check("/big", { keyword: "needle" })
    assert.equal(result.errorMessage, "Keyword not found")
  })

  it("respects a smaller maxBodyBytes", async () => {
    const result = await check(
      "/ok",
      { keyword: "world", followRedirects: false },
      { maxBodyBytes: 5 }
    )
    assert.equal(result.isUp, false)
  })

  it("connection refused", async () => {
    const closed = createServer()
    const port = await listen(closed)
    await new Promise((resolve) => closed.close(resolve))
    const result = await runHttpCheck(request(`http://app.test:${port}/`), {
      guard: testGuard,
    })
    assert.equal(result.errorMessage, "Connection refused")
  })

  it("unknown hostnames: 'DNS not found'", async () => {
    const result = await runHttpCheck(
      request("http://does-not-exist.invalid/"),
      {
        lookup: async () => {
          throw Object.assign(new Error("nope"), { code: "ENOTFOUND" })
        },
      }
    )
    assert.equal(result.status, "down")
    assert.equal(result.errorMessage, "DNS not found")
  })
})

describe("runHttpCheck: SSRF", () => {
  it("refuses literal private URLs (no request made)", async () => {
    const result = await runHttpCheck(
      request(`http://127.0.0.1:${appPort}/ok`, { followRedirects: false })
    )
    assert.equal(result.status, "down")
    assert.equal(result.statusCode, null)
    assert.match(result.errorMessage ?? "", /private or internal/)
  })

  it("refuses a hostname whose DNS answer is private", async () => {
    const result = await runHttpCheck(
      request(`http://evil.example:${appPort}/ok`),
      { lookup: fakeDns("127.0.0.1") }
    )
    assert.equal(result.statusCode, null)
    assert.match(result.errorMessage ?? "", /private or internal/)
  })

  it("refuses a mixed public + private DNS answer", async () => {
    const result = await runHttpCheck(request("http://mixed.example/"), {
      lookup: fakeDns("93.184.215.14", "10.1.2.3"),
    })
    assert.match(result.errorMessage ?? "", /private or internal/)
  })

  it("refuses cloud metadata via IPv4-mapped IPv6 in DNS", async () => {
    const result = await runHttpCheck(request("http://meta.example/"), {
      lookup: fakeDns("::ffff:169.254.169.254"),
    })
    assert.match(result.errorMessage ?? "", /private or internal/)
  })

  for (const path of [
    "/redirect-private",
    "/redirect-localhost",
    "/redirect-metadata",
  ]) {
    it(`blocks a redirect to a private address (${path})`, async () => {
      const result = await check(path)
      assert.equal(result.isUp, false)
      assert.match(result.errorMessage ?? "", /^Redirect blocked/)
    })
  }
})

describe("runHttpCheck: redirects", () => {
  it("follows safe redirects", async () => {
    const result = await check("/redirect-ok", { keyword: "hello" })
    assert.equal(result.isUp, true)
    assert.equal(result.statusCode, 200)
  })

  it("doesn't follow redirects when disabled", async () => {
    const result = await check("/redirect-ok", { followRedirects: false })
    assert.equal(result.isUp, false)
    assert.equal(result.statusCode, 302)
  })

  it("stops a redirect loop after 5 hops", async () => {
    let hops = 0
    const result = await runHttpCheck(
      request(`http://app.test:${appPort}/loop`),
      {
        guard: (url) => {
          hops++
          return testGuard(url)
        },
      }
    )
    assert.equal(result.status, "down")
    assert.equal(result.errorMessage, "Too many redirects (more than 5)")
    // The original request + 5 followed redirects.
    assert.equal(hops, 6)
  })

  it("drops custom headers on cross-origin redirects", async () => {
    const headers = [{ name: "Authorization", value: "Bearer secret" }]
    const sameOrigin = await check("/echo-auth", {
      headers,
      keyword: "auth=present",
    })
    assert.equal(sameOrigin.isUp, true)
    const crossOrigin = await check("/redirect-other", {
      headers,
      keyword: "auth=none",
    })
    assert.equal(crossOrigin.isUp, true)
  })
})
