import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { schools } from "./schools";

export const dataQualityChecks = pgTable(
  "data_quality_checks",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 }).references(() => schools.id, { onDelete: "cascade" }),
    checkKey: text("check_key").notNull(),
    label: text("label").notNull(),
    status: text("status", {
      enum: ["passed", "warning", "failed"],
    }).notNull(),
    score: integer("score").notNull().default(0),
    details: text("details"),
    checkedAt: timestamp("checked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolIdx: index("data_quality_school_idx").on(table.schoolId),
    statusIdx: index("data_quality_status_idx").on(table.status),
    checkIdx: index("data_quality_check_idx").on(table.checkKey),
  }),
);
