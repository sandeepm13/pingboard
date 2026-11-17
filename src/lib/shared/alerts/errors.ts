/**
 * A failed delivery. `permanent` = retrying can't help (bad webhook, rejected
 * address, wrong credentials); the alerts worker then stops retrying. The
 * message is user-facing and must never contain a secret (webhook URL, token).
 */
export class DeliveryError extends Error {
  readonly permanent: boolean

  constructor(message: string, options: { permanent: boolean }) {
    super(message)
    this.name = "DeliveryError"
    this.permanent = options.permanent
  }
}

/** 4xx means "fix the channel", except 408/429 which are worth retrying. */
export function isPermanentHttpStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}
