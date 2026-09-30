import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { enrollmentSnapshots } from "./enrollment";
import { infrastructureProjects, infrastructureSnapshots } from "./infrastructure";
import { performanceRecords } from "./performance";
import { reportRuns } from "./reports";

export const academicYears = pgTable(
  "academic_years",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    name: text("name").notNull(),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    status: text("status", {
      enum: ["planned", "active", "closed", "archived"],
    })
      .notNull()
      .default("planned"),
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: uniqueIndex("academic_years_name_idx").on(table.name),
    statusIdx: index("academic_years_status_idx").on(table.status),
  }),
);

export const terms = pgTable(
  "terms",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: text("starts_on"),
    endsOn: text("ends_on"),
    sequence: integer("sequence").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
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
