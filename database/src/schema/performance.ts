import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { academicYears, terms } from "./academicyear";
import { schools } from "./schools";

export const performanceRecords = sqliteTable(
  "performance_records",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: text("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    termId: text("term_id").references(() => terms.id, { onDelete: "set null" }),
    assessmentName: text("assessment_name").notNull(),
    assessmentType: text("assessment_type", {
      enum: ["internal", "county", "national", "other"],
    }).notNull(),
    gradeBand: text("grade_band"),
    candidates: integer("candidates").notNull().default(0),
    averageScore: real("average_score"),
    passRate: real("pass_rate"),
    ranking: integer("ranking"),
    status: text("status", {
      enum: ["draft", "submitted", "verified"],
    })
      .notNull()
      .default("draft"),
    capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    notes: text("notes"),
  },
  (table) => ({
    schoolYearAssessmentIdx: uniqueIndex("performance_school_year_assessment_idx").on(
      table.schoolId,
      table.academicYearId,
      table.termId,
      table.assessmentName,
    ),
    yearIdx: index("performance_year_idx").on(table.academicYearId),
    statusIdx: index("performance_status_idx").on(table.status),
  }),
);

export const performanceSubjectRows = sqliteTable(
  "performance_subject_rows",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    performanceRecordId: text("performance_record_id")
      .notNull()
      .references(() => performanceRecords.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    candidates: integer("candidates").notNull().default(0),
    averageScore: real("average_score"),
    passRate: real("pass_rate"),
  },
  (table) => ({
    recordSubjectIdx: uniqueIndex("performance_record_subject_idx").on(
      table.performanceRecordId,
      table.subject,
    ),
  }),
);

export const performanceRecordRelations = relations(
  performanceRecords,
  ({ one, many }) => ({
    school: one(schools, {
      fields: [performanceRecords.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [performanceRecords.academicYearId],
      references: [academicYears.id],
    }),
    term: one(terms, {
      fields: [performanceRecords.termId],
      references: [terms.id],
    }),
    subjects: many(performanceSubjectRows),
  }),
);

export const performanceSubjectRowRelations = relations(
  performanceSubjectRows,
  ({ one }) => ({
    performanceRecord: one(performanceRecords, {
      fields: [performanceSubjectRows.performanceRecordId],
      references: [performanceRecords.id],
    }),
  }),
);
