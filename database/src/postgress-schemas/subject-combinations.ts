import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { academicYears } from "./academicyear";
import { schools } from "./schools";

export const schoolSubjectCombinations = pgTable(
  "school_subject_combinations",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    combination: text("combination").notNull(),
    pathway: text("pathway").notNull(),
    track: text("track").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
