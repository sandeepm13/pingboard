import { MONITOR_LIMITS } from "./constants"
import type { StatusCodeRange } from "./types"

// "200-299, 301, 4xx" <-> [{from, to}]. Used by the form schema, the edit form
// defaults and the checker.

export type ParseStatusCodesResult =
  { ok: true; ranges: StatusCodeRange[] } | { ok: false; error: string }

export function parseStatusCodes(spec: string): ParseStatusCodesResult {
  const tokens = spec.split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) {
    return { ok: false, error: "Enter at least one status code, e.g. 200-299" }
  }
  if (tokens.length > MONITOR_LIMITS.statusRangesMax) {
    return {
      ok: false,
      error: `Use at most ${MONITOR_LIMITS.statusRangesMax} codes or ranges`,
    }
  }

  const ranges: StatusCodeRange[] = []
  for (const token of tokens) {
    const family = /^([1-5])xx$/i.exec(token)
    if (family) {
      const base = Number(family[1]) * 100
      ranges.push({ from: base, to: base + 99 })
      continue
    }
    const match = /^(\d{3})(?:-(\d{3}))?$/.exec(token)
    if (!match) {
      return { ok: false, error: `"${token}" isn't a status code or range` }
    }
    const from = Number(match[1])
    const to = match[2] ? Number(match[2]) : from
    if (from < 100 || to > 599 || from > to) {
      return { ok: false, error: `"${token}" isn't a valid range (100–599)` }
    }
    ranges.push({ from, to })
  }
  return { ok: true, ranges }
}

export function formatStatusCodes(ranges: StatusCodeRange[]): string {
  return ranges
    .map(({ from, to }) => (from === to ? String(from) : `${from}-${to}`))
    .join(", ")
}

export function matchesStatusCode(
  code: number,
  ranges: StatusCodeRange[]
): boolean {
  return ranges.some(({ from, to }) => code >= from && code <= to)
}
