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

// Next.js development reloads must reuse the pool; abandoned pools can exhaust
// Supabase's session-mode connection limit when web and sync run together.
const shared = globalThis as typeof globalThis & {
  __scsmsPostgresClient?: ReturnType<typeof postgres>;
};
const client = shared.__scsmsPostgresClient ?? postgres(connectionString, {
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { application_name: "scsms-web" },
});
shared.__scsmsPostgresClient = client;

export const db = drizzle(client, { schema });
