import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { academicYears } from "./academicyear";
import { schools } from "./schools";

export const schoolSubjectCombinations = sqliteTable(
  "school_subject_combinations",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: text("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    combination: text("combination").notNull(),
    pathway: text("pathway").notNull(),
    track: text("track").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolYearIdx: index("subject_combinations_school_year_idx").on(
      table.schoolId,
      table.academicYearId,
    ),
    schoolCodeIdx: uniqueIndex("subject_combinations_school_code_idx").on(
      table.schoolId,
      table.code,
    ),
  }),
);

export const schoolSubjectCombinationRelations = relations(
  schoolSubjectCombinations,
  ({ one }) => ({
    school: one(schools, {
      fields: [schoolSubjectCombinations.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [schoolSubjectCombinations.academicYearId],
      references: [academicYears.id],
    }),
  }),
);
