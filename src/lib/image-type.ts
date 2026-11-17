// Logo uploads: the type comes from the file's first bytes, never from the
// browser-supplied name or MIME type. SVG is deliberately not accepted: it can
// carry scripts and links.

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const

export type LogoType = (typeof LOGO_TYPES)[number]

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, i) => bytes[offset + i] === value)
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

export function sniffImageType(bytes: Uint8Array): LogoType | null {
  if (startsWith(bytes, PNG)) return "image/png"
  if (startsWith(bytes, JPEG)) return "image/jpeg"
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp"
  }
  return null
}
