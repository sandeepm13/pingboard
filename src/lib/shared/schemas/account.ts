import { z } from "zod"

import { isValidTimeZone } from "../time"
import { emailSchema, nameSchema, newPasswordSchema } from "./auth"

// Settings forms (client) and the account server actions share these.

/** Unlike signup's lenient zone, a settings change must name a real zone. */
export const settingsTimezoneSchema = z
  .string()
  .max(64)
  .refine(isValidTimeZone, "Pick a time zone from the list")

export const profileSchema = z.object({
  name: nameSchema,
  timezone: settingsTimezoneSchema,
})

/** `currentPassword` is required whenever the account already has a password. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(256),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords don't match",
  })

export const deleteAccountSchema = z.object({
  confirmEmail: emailSchema,
  password: z.string().max(256),
})

export const waitlistSchema = z.object({
  email: emailSchema,
})

export type ProfileInput = z.input<typeof profileSchema>
export type ChangePasswordInput = z.input<typeof changePasswordSchema>
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>
export type WaitlistInput = z.input<typeof waitlistSchema>
