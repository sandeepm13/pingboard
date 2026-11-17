import "server-only"

import { connectMongo } from "@shared/db"

import { getEnv } from "./env"

/** Ensures the shared, hot-reload-safe Mongo connection is open. */
export function connectDb() {
  const env = getEnv()
  return connectMongo(env.MONGODB_URI, { dbName: env.MONGODB_DB })
}
