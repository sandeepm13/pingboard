import mongoose from "mongoose"

// Cached on globalThis so Next.js dev hot-reloads don't open a new connection
// on every change. The worker gets the same behaviour for free.
const globalForMongoose = globalThis as typeof globalThis & {
  __mongoose?: Promise<typeof mongoose>
}

export function connectMongo(
  uri: string,
  options: { dbName?: string } = {}
): Promise<typeof mongoose> {
  if (!globalForMongoose.__mongoose) {
    globalForMongoose.__mongoose = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5_000, dbName: options.dbName })
      .catch((error: unknown) => {
        globalForMongoose.__mongoose = undefined
        throw error
      })
  }
  return globalForMongoose.__mongoose
}

export async function disconnectMongo(): Promise<void> {
  globalForMongoose.__mongoose = undefined
  await mongoose.disconnect()
}
