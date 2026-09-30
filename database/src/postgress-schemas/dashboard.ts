import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const dashboardSnapshots = pgTable(
  "dashboard_snapshots",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    key: text("key").notNull(),
    metricsJson: text("metrics_json").notNull(),
    generatedAt: timestamp("generated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("dashboard_snapshots_key_idx").on(table.key),
  }),
);
