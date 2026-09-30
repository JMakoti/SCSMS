import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable(
  "settings",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    key: text("key").notNull(),
    value: text("value"),
    valueType: text("value_type", {
      enum: ["string", "number", "boolean", "json"],
    })
      .notNull()
      .default("string"),
    group: text("group").notNull().default("general"),
    description: text("description"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("settings_key_idx").on(table.key),
  }),
);
