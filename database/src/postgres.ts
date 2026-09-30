import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./postgress-schemas";

const runtimeEnv = globalThis as typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const connectionString = runtimeEnv.process?.env?.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
