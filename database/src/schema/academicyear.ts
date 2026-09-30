import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { enrollmentSnapshots } from "./enrollment";
import { infrastructureProjects, infrastructureSnapshots } from "./infrastructure";
import { performanceRecords } from "./performance";
import { reportRuns } from "./reports";

export const academicYears = sqliteTable(
  "academic_years",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    name: text("name").notNull(),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    status: text("status", {
      enum: ["planned", "active", "closed", "archived"],
    })
      .notNull()
      .default("planned"),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: uniqueIndex("academic_years_name_idx").on(table.name),
    statusIdx: index("academic_years_status_idx").on(table.status),
  }),
);

export const terms = sqliteTable(
  "terms",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    academicYearId: text("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: text("starts_on"),
    endsOn: text("ends_on"),
    sequence: integer("sequence").notNull(),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    yearSequenceIdx: uniqueIndex("terms_year_sequence_idx").on(
      table.academicYearId,
      table.sequence,
    ),
    yearNameIdx: uniqueIndex("terms_year_name_idx").on(table.academicYearId, table.name),
  }),
);

export const academicYearRelations = relations(academicYears, ({ many }) => ({
  terms: many(terms),
  enrollmentSnapshots: many(enrollmentSnapshots),
  infrastructureSnapshots: many(infrastructureSnapshots),
  infrastructureProjects: many(infrastructureProjects),
  performanceRecords: many(performanceRecords),
  reportRuns: many(reportRuns),
}));

export const termRelations = relations(terms, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [terms.academicYearId],
    references: [academicYears.id],
  }),
  enrollmentSnapshots: many(enrollmentSnapshots),
  // performanceRecords: many(performanceRecords),
  reportRuns: many(reportRuns),
}));
