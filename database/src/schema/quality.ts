import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { schools } from "./schools";

export const dataQualityChecks = sqliteTable(
  "data_quality_checks",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id").references(() => schools.id, { onDelete: "cascade" }),
    checkKey: text("check_key").notNull(),
    label: text("label").notNull(),
    status: text("status", {
      enum: ["passed", "warning", "failed"],
    }).notNull(),
    score: integer("score").notNull().default(0),
    details: text("details"),
    checkedAt: text("checked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolIdx: index("data_quality_school_idx").on(table.schoolId),
    statusIdx: index("data_quality_status_idx").on(table.status),
    checkIdx: index("data_quality_check_idx").on(table.checkKey),
  }),
);
