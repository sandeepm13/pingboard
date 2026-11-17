// Pure IP parsing and blocklist (no Node APIs), so the browser form and the
// server share exactly one definition of "private or internal".

type Cidr = { bytes: number[]; prefix: number }

/** Strict dotted-quad. Callers pass URL-normalised hosts or DNS answers, which never use octal/hex. */
export function parseIPv4(input: string): number[] | null {
  const parts = input.split(".")
  if (parts.length !== 4) return null
  const bytes: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    if (part.length > 1 && part.startsWith("0")) return null
    const value = Number(part)
    if (value > 255) return null
    bytes.push(value)
  }
  return bytes
}

/** Returns 16 bytes. Accepts brackets, a zone id (`%eth0`) and an embedded IPv4 tail. */
export function parseIPv6(input: string): number[] | null {
  let text = input
  if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1)
  const zone = text.indexOf("%")
  if (zone !== -1) text = text.slice(0, zone)
  if (!text.includes(":")) return null

  const lastColon = text.lastIndexOf(":")
  const tail = text.slice(lastColon + 1)
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail)
    if (!v4) return null
    const [a, b, c, d] = v4 as [number, number, number, number]
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }

  const halves = text.split("::")
  if (halves.length > 2) return null
  const split = (part: string) => (part === "" ? [] : part.split(":"))
  const head = split(halves[0] ?? "")
  const rest = halves.length === 2 ? split(halves[1] ?? "") : []

  let groups: string[]
  if (halves.length === 1) {
    if (head.length !== 8) return null
    groups = head
  } else {
    // "::" stands for at least one zero group.
    const missing = 8 - head.length - rest.length
    if (missing < 1) return null
    groups = [...head, ...Array<string>(missing).fill("0"), ...rest]
  }

  const bytes: number[] = []
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null
    const value = parseInt(group, 16)
    bytes.push(value >> 8, value & 0xff)
  }
  return bytes
}

export function ipFamily(address: string): 4 | 6 | null {
  if (parseIPv4(address)) return 4
  if (parseIPv6(address)) return 6
  return null
}

function cidr(spec: string): Cidr {
  const [address = "", prefix = ""] = spec.split("/")
  const bytes = parseIPv4(address) ?? parseIPv6(address)
  if (!bytes) throw new Error(`Invalid CIDR in blocklist: ${spec}`)
  return { bytes, prefix: Number(prefix) }
}

function inCidr(bytes: number[], range: Cidr): boolean {
  if (bytes.length !== range.bytes.length) return false
  let bits = range.prefix
  for (let i = 0; bits > 0; i++, bits -= 8) {
    const mask = bits >= 8 ? 0xff : (0xff << (8 - bits)) & 0xff
    if (((bytes[i] ?? 0) & mask) !== ((range.bytes[i] ?? 0) & mask)) {
      return false
    }
  }
  return true
}

const BLOCKED_V4 = [
  "0.0.0.0/8", // "this network"
  "10.0.0.0/8", // private
  "100.64.0.0/10", // carrier-grade NAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local, incl. cloud metadata 169.254.169.254
  "172.16.0.0/12", // private
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // documentation
  "192.88.99.0/24", // 6to4 relay anycast
  "192.168.0.0/16", // private
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // documentation
  "203.0.113.0/24", // documentation
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved, incl. broadcast
].map(cidr)

// IPv6 is allow-listed to global unicast (2000::/3), minus special blocks inside it.
const V6_GLOBAL_UNICAST = cidr("2000::/3")
const BLOCKED_V6 = [
  "2001::/23", // IETF protocol assignments, incl. Teredo 2001::/32
  "2001:db8::/32", // documentation
  "3fff::/20", // documentation
].map(cidr)

// Ranges that embed an IPv4 address: unwrap and judge the IPv4 instead.
const V4_MAPPED = cidr("::ffff:0:0/96")
const NAT64 = cidr("64:ff9b::/96")
const SIX_TO_FOUR = cidr("2002::/16")

function isBlockedV4(bytes: number[]): boolean {
  return BLOCKED_V4.some((range) => inCidr(bytes, range))
}

/**
 * True unless the address is public unicast. Unparseable input counts as
 * blocked (fail closed).
 */
export function isBlockedIp(address: string): boolean {
  const v4 = parseIPv4(address)
  if (v4) return isBlockedV4(v4)

  const v6 = parseIPv6(address)
  if (!v6) return true
  if (inCidr(v6, V4_MAPPED) || inCidr(v6, NAT64)) {
    return isBlockedV4(v6.slice(12))
  }
  if (inCidr(v6, SIX_TO_FOUR)) return isBlockedV4(v6.slice(2, 6))
  if (!inCidr(v6, V6_GLOBAL_UNICAST)) return true
  return BLOCKED_V6.some((range) => inCidr(v6, range))
}
