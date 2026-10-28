import "server-only"

import bcrypt from "bcryptjs"

const BCRYPT_COST = 12

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST)
}

let dummyHash: Promise<string> | undefined

/**
 * Compares against a real hash, or a throwaway one when the user doesn't exist,
 * so response time doesn't reveal which emails have accounts.
 */
export async function verifyPassword(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) {
    dummyHash ??= bcrypt.hash("pingboard-timing-equaliser", BCRYPT_COST)
    await bcrypt.compare(password, await dummyHash)
    return false
  }
  return bcrypt.compare(password, hash)
}
