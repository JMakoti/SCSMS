import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./index";

const sqlite = new Database("scsms.db");

export const db = drizzle(sqlite, { schema });
