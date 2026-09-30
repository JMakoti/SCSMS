import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const settings = pgTable(
  "settings",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    key: text("key").notNull(),
    value: text("value"),
    valueType: text("value_type", {
      enum: ["string", "number", "boolean", "json"],
    })
      .notNull()
      .default("string"),
    group: text("group").notNull().default("general"),
    description: text("description"),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("settings_key_idx").on(table.key),
  }),
);
