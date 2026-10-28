import "server-only"

import {
  decryptSecret,
  encryptSecret,
  parseEncryptionKey,
} from "@shared/security/secrets"

import { getEnv } from "./env"

let key: Buffer | undefined

function encryptionKey() {
  key ??= parseEncryptionKey(getEnv().ENCRYPTION_KEY)
  return key
}

export function encrypt(plaintext: string): string {
  return encryptSecret(plaintext, encryptionKey())
}

export function decrypt(payload: string): string {
  return decryptSecret(payload, encryptionKey())
}
