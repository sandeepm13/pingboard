import "server-only"

import { currentZoneName } from "@shared/time"

/** Every IANA zone this server knows, under current names, sorted. */
export function listTimeZones(): string[] {
  return [
    ...new Set(Intl.supportedValuesOf("timeZone").map(currentZoneName)),
  ].sort()
}
