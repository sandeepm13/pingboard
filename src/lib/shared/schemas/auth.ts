import { z } from "zod"

import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "../constants"
import { isValidTimeZone } from "../time"

// Shared by the client forms (react-hook-form) and the server actions.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email")
  .max(254, "Email is too long")
  .pipe(z.email({ error: "Enter a valid email address" }))

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    "Password is too long (max 72 bytes)"
  )

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name")
  .max(80, "Name is too long")

/** IANA zone from the browser; anything unknown falls back to UTC. */
export const timezoneSchema = z
  .string()
  .max(64)
  .refine(isValidTimeZone)
  .catch("UTC")

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
  timezone: timezoneSchema.optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(256),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords don't match",
  })

export const onboardingSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2048, "URL is too long")
    .pipe(
      z.url({
        protocol: /^https?$/,
        error: "Enter a full URL starting with http:// or https://",
      })
    ),
  name: z.string().trim().max(80, "Name is too long").optional(),
  timezone: timezoneSchema.optional(),
})

export type SignupInput = z.input<typeof signupSchema>
export type LoginInput = z.input<typeof loginSchema>
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>
export type OnboardingInput = z.input<typeof onboardingSchema>
