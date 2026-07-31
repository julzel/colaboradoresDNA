import "server-only";

import { Db, MongoClient, ServerApiVersion, type MongoClientOptions } from "mongodb";
import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.url().startsWith("mongodb"),
});

const clientOptions: MongoClientOptions = {
  maxPoolSize: 10,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

function getDatabaseEnvironment() {
  return databaseEnvironmentSchema.parse({
    MONGODB_DB: process.env.MONGODB_DB,
    MONGODB_URI: process.env.MONGODB_URI,
  });
}

export function getMongoClient(): Promise<MongoClient> {
  const { MONGODB_URI } = getDatabaseEnvironment();

  if (!globalThis.mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, clientOptions);
    globalThis.mongoClientPromise = client.connect();
  }

  return globalThis.mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const { MONGODB_DB } = getDatabaseEnvironment();
  const client = await getMongoClient();

  return client.db(MONGODB_DB);
}
