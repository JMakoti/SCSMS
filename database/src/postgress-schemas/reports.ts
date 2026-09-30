import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { academicYears, terms } from "./academicyear";
import { schools } from "./schools";
import { users } from "./user";

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    key: text("key").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    frequency: text("frequency", {
      enum: ["weekly", "monthly", "termly", "annual", "ad_hoc"],
    }).notNull(),
    defaultFormat: text("default_format", {
      enum: ["pdf", "xlsx", "csv", "pdf_xlsx"],
    })
      .notNull()
      .default("pdf_xlsx"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    keyIdx: uniqueIndex("report_templates_key_idx").on(table.key),
    codeIdx: uniqueIndex("report_templates_code_idx").on(table.code),
    categoryIdx: index("report_templates_category_idx").on(table.category),
  }),
);

export const reportRuns = pgTable(
  "report_runs",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    templateId: varchar("template_id", { length: 36 })
      .notNull()
      .references(() => reportTemplates.id, { onDelete: "cascade" }),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    termId: varchar("term_id", { length: 36 }).references(() => terms.id, { onDelete: "set null" }),
    schoolId: varchar("school_id", { length: 36 }).references(() => schools.id, { onDelete: "set null" }),
    generatedByUserId: varchar("generated_by_user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["queued", "ready", "exported", "failed", "archived"],
    })
      .notNull()
      .default("queued"),
    format: text("format", { enum: ["pdf", "xlsx", "csv", "pdf_xlsx"] }).notNull(),
    filtersJson: text("filters_json"),
    filePath: text("file_path"),
    recordsIncluded: integer("records_included").notNull().default(0),
    generatedAt: timestamp("generated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    exportedAt: timestamp("exported_at"),
    notes: text("notes"),
  },
  (table) => ({
    templateYearIdx: index("report_runs_template_year_idx").on(
      table.templateId,
      table.academicYearId,
    ),
    schoolIdx: index("report_runs_school_idx").on(table.schoolId),
    statusIdx: index("report_runs_status_idx").on(table.status),
  }),
);

export const reportTemplateRelations = relations(reportTemplates, ({ many }) => ({
  runs: many(reportRuns),
}));

export const reportRunRelations = relations(reportRuns, ({ one }) => ({
  template: one(reportTemplates, {
    fields: [reportRuns.templateId],
    references: [reportTemplates.id],
  }),
  academicYear: one(academicYears, {
    fields: [reportRuns.academicYearId],
    references: [academicYears.id],
  }),
  term: one(terms, {
    fields: [reportRuns.termId],
    references: [terms.id],
  }),
  school: one(schools, {
    fields: [reportRuns.schoolId],
    references: [schools.id],
  }),
  generatedBy: one(users, {
    fields: [reportRuns.generatedByUserId],
    references: [users.id],
  }),
}));
