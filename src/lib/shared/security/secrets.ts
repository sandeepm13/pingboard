import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

// AES-256-GCM for secrets at rest (monitor header values and bodies; later
// webhook URLs and bot tokens). Format: "v1.<iv>.<tag>.<ciphertext>" (base64url).

const VERSION = "v1"
const IV_BYTES = 12

/** Decodes ENCRYPTION_KEY (base64, 32 bytes). Throws on anything else. */
export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64")
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes encoded as base64")
  }
  return key
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = payload.split(".")
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error("Unrecognised encrypted value")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
