import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const dashboardSnapshots = sqliteTable(
  "dashboard_snapshots",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    key: text("key").notNull(),
    metricsJson: text("metrics_json").notNull(),
    generatedAt: text("generated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("dashboard_snapshots_key_idx").on(table.key),
  }),
);
