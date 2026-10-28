/**
 * Small seeded PRNG for deterministic fake data (styleguide, landing-page
 * demos): no Math.random(), so prerendered pages are identical on every build
 * and never mismatch on hydration.
 */
export function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
