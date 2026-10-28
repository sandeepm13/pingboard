import assert from "node:assert/strict"
import { describe, it } from "vitest"

import { isBlockedIp } from "../src/lib/shared/security/ip"
import {
  resolvePublicTarget,
  type LookupFn,
} from "../src/lib/shared/security/ssrf"
import { checkUrlPolicy } from "../src/lib/shared/security/url-policy"

describe("isBlockedIp", () => {
  const blocked = [
    "127.0.0.1",
    "127.255.255.254",
    "0.0.0.0",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1", // CGNAT
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fe80::1",
    "fe80::1%eth0",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "::ffff:127.0.0.1", // IPv4-mapped, dotted
    "::ffff:7f00:1", // IPv4-mapped, hex
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "::127.0.0.1", // IPv4-compatible (deprecated)
    "64:ff9b::a00:1", // NAT64 of 10.0.0.1
    "2002:7f00:1::", // 6to4 of 127.0.0.1
    "2001:db8::1",
    "2001::1", // Teredo
    "[::1]",
    "not-an-ip",
    "",
    "1.2.3",
    "256.1.1.1",
  ]
  for (const address of blocked) {
    it(`blocks ${JSON.stringify(address)}`, () => {
      assert.equal(isBlockedIp(address), true)
    })
  }

  const allowed = [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.215.14",
    "172.32.0.1", // just outside 172.16/12
    "100.128.0.1", // just outside CGNAT
    "2606:4700:4700::1111",
    "2a00:1450:4001:80b::200e",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808", // NAT64 of 8.8.8.8
    "2002:808:808::", // 6to4 of 8.8.8.8
  ]
  for (const address of allowed) {
    it(`allows ${address}`, () => {
      assert.equal(isBlockedIp(address), false)
    })
  }
})

describe("checkUrlPolicy", () => {
  const rejected = [
    "http://127.0.0.1/",
    "http://localhost:3000/",
    "http://LOCALHOST./",
    "http://api.localhost/",
    "http://printer.local/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://2130706433/", // decimal 127.0.0.1
    "http://0x7f000001/", // hex
    "http://0x7f.0x0.0x0.0x1/",
    "http://0177.0.0.1/", // octal
    "http://127.1/", // short form
    "http://0/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[fe80::1]/",
    "http://10.0.0.5:8080/",
    "http://intranet/", // single label
    "http://redis:6379/",
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "gopher://example.com/",
    "http://user:pass@example.com/",
    "http://example.com:22/",
    "http://example.com:6379/",
    "http://example.com:27017/",
    "not a url",
  ]
  for (const url of rejected) {
    it(`rejects ${url}`, () => {
      assert.equal(checkUrlPolicy(url).ok, false)
    })
  }

  const accepted = [
    "https://example.com/",
    "http://example.com:8080/health?x=1",
    "https://api.example.co.uk/v1",
    "https://8.8.8.8/",
    "https://[2606:4700:4700::1111]/",
    "https://xn--bcher-kva.example/",
  ]
  for (const url of accepted) {
    it(`accepts ${url}`, () => {
      assert.equal(checkUrlPolicy(url).ok, true)
    })
  }

  it("allows private targets only with allowPrivate", () => {
    assert.equal(
      checkUrlPolicy("http://localhost:3000/", { allowPrivate: true }).ok,
      true
    )
    assert.equal(checkUrlPolicy("http://10.0.0.1/").ok, false)
  })
})

function fakeDns(answers: Record<string, string[]>): LookupFn {
  return async (hostname) => {
    const addresses = answers[hostname]
    if (!addresses)
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" })
    return addresses.map((address) => ({
      address,
      family: address.includes(":") ? 6 : 4,
    }))
  }
}

describe("resolvePublicTarget", () => {
  const lookup = fakeDns({
    "public.test": ["93.184.215.14"],
    "evil.test": ["127.0.0.1"],
    "metadata.test": ["169.254.169.254"],
    "mixed.test": ["93.184.215.14", "10.0.0.7"],
    "mapped.test": ["::ffff:192.168.0.1"],
    "v6-loopback.test": ["::1"],
    "dual.test": ["2606:4700:4700::1111", "1.1.1.1"],
    "empty.test": [],
  })

  it("pins the validated IP for a public hostname", async () => {
    const result = await resolvePublicTarget("https://public.test/x", {
      lookup,
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.target.address, "93.184.215.14")
      assert.equal(result.target.hostname, "public.test")
    }
  })

  for (const host of [
    "evil.test",
    "metadata.test",
    "mapped.test",
    "v6-loopback.test",
  ]) {
    it(`blocks ${host} (DNS returns a private address)`, async () => {
      const result = await resolvePublicTarget(`https://${host}/`, { lookup })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.code, "blocked")
    })
  }

  it("blocks when DNS returns mixed public + private addresses", async () => {
    const result = await resolvePublicTarget("https://mixed.test/", { lookup })
    assert.equal(result.ok, false)
  })

  it("prefers IPv4 from a dual-stack answer", async () => {
    const result = await resolvePublicTarget("https://dual.test/", { lookup })
    assert.equal(result.ok && result.target.address, "1.1.1.1")
  })

  it("fails on empty or failed lookups", async () => {
    for (const url of ["https://empty.test/", "https://missing.test/"]) {
      const result = await resolvePublicTarget(url, { lookup })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.code, "dns")
    }
  })

  it("never calls DNS for rejected literals", async () => {
    let called = false
    const result = await resolvePublicTarget("http://0x7f.1/", {
      lookup: async () => {
        called = true
        return []
      },
    })
    assert.equal(result.ok, false)
    assert.equal(called, false)
  })

  it("lets private answers through only with allowPrivate", async () => {
    const result = await resolvePublicTarget("https://evil.test/", {
      lookup,
      allowPrivate: true,
    })
    assert.equal(result.ok, true)
  })
})
