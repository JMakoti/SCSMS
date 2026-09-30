import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { academicYears, terms } from "./academicyear";
import { schools } from "./schools";

export const enrollmentSnapshots = pgTable(
  "enrollment_snapshots",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    termId: varchar("term_id", { length: 36 }).references(() => terms.id, { onDelete: "set null" }),
    status: text("status", {
      enum: ["draft", "submitted", "verified", "returned"],
    })
      .notNull()
      .default("draft"),
    capturedBy: text("captured_by"),
    capturedAt: timestamp("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    verifiedAt: timestamp("verified_at"),
    notes: text("notes"),
  },
  (table) => ({
    schoolYearTermIdx: uniqueIndex("enrollment_school_year_term_idx").on(
      table.schoolId,
      table.academicYearId,
      table.termId,
    ),
    yearIdx: index("enrollment_year_idx").on(table.academicYearId),
    statusIdx: index("enrollment_status_idx").on(table.status),
  }),
);

export const enrollmentGradeRows = pgTable(
  "enrollment_grade_rows",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    snapshotId: varchar("snapshot_id", { length: 36 })
      .notNull()
      .references(() => enrollmentSnapshots.id, { onDelete: "cascade" }),
    grade: text("grade").notNull(),
    gradeBand: text("grade_band").notNull(),
    male: integer("male").notNull().default(0),
    female: integer("female").notNull().default(0),
    total: integer("total").notNull().default(0),
  },
  (table) => ({
    snapshotGradeIdx: uniqueIndex("enrollment_snapshot_grade_idx").on(
      table.snapshotId,
      table.grade,
    ),
  }),
);

export const enrollmentSnapshotRelations = relations(
  enrollmentSnapshots,
  ({ one, many }) => ({
    school: one(schools, {
      fields: [enrollmentSnapshots.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [enrollmentSnapshots.academicYearId],
      references: [academicYears.id],
    }),
    term: one(terms, {
      fields: [enrollmentSnapshots.termId],
      references: [terms.id],
    }),
    gradeRows: many(enrollmentGradeRows),
  }),
);

export const enrollmentGradeRowRelations = relations(enrollmentGradeRows, ({ one }) => ({
  snapshot: one(enrollmentSnapshots, {
    fields: [enrollmentGradeRows.snapshotId],
    references: [enrollmentSnapshots.id],
  }),
}));
