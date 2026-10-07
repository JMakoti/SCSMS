import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { academicYears, terms } from "./academicyear";
import { schools } from "./schools";

export const infrastructureSnapshots = sqliteTable(
  "infrastructure_snapshots",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: text("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["draft", "submitted", "verified"],
    })
      .notNull()
      .default("draft"),
    capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    verifiedAt: text("verified_at"),
    notes: text("notes"),
  },
  (table) => ({
    schoolYearIdx: uniqueIndex("infrastructure_school_year_idx").on(
      table.schoolId,
      table.academicYearId,
    ),
    yearIdx: index("infrastructure_year_idx").on(table.academicYearId),
    statusIdx: index("infrastructure_status_idx").on(table.status),
  }),
);

export const infrastructureFacilityRows = sqliteTable(
  "infrastructure_facility_rows",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => infrastructureSnapshots.id, { onDelete: "cascade" }),
    facilityType: text("facility_type").notNull(),
    available: integer("available").notNull().default(0),
    good: integer("good").notNull().default(0),
    needsRepair: integer("needs_repair").notNull().default(0),
    status: text("status", {
      enum: ["active", "pending", "completed", "needs_repair", "unavailable"],
    })
      .notNull()
      .default("active"),
    notes: text("notes"),
  },
  (table) => ({
    snapshotFacilityIdx: uniqueIndex("infrastructure_snapshot_facility_idx").on(
      table.snapshotId,
      table.facilityType,
    ),
  }),
);

export const infrastructureProjects = sqliteTable(
  "infrastructure_projects",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: text("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    termId: text("term_id").references(() => terms.id, {
      onDelete: "set null",
    }),
    projectName: text("project_name").notNull(),
    projectType: text("project_type").notNull(),
    projectContractor:text("project_contractor").notNull(),
    status: text("status", {
      enum: ["planned", "in_progress", "completed", "deferred", "cancelled"],
    })
      .notNull()
      .default("planned"),
    projectConditions:text("project_conditions").notNull(),
    budgetAmount: real("budget_amount"),
    fundingSource: text("funding_source"),
    startsOn: text("starts_on"),
    completedOn: text("completed_on"),
    description: text("description"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolYearIdx: index("infrastructure_projects_school_year_idx").on(
      table.schoolId,
      table.academicYearId,
    ),
    statusIdx: index("infrastructure_projects_status_idx").on(table.status),
  }),
);

export const infrastructureSnapshotRelations = relations(
  infrastructureSnapshots,
  ({ one, many }) => ({
    school: one(schools, {
      fields: [infrastructureSnapshots.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [infrastructureSnapshots.academicYearId],
      references: [academicYears.id],
    }),
    facilities: many(infrastructureFacilityRows),
  }),
);

export const infrastructureFacilityRowRelations = relations(
  infrastructureFacilityRows,
  ({ one }) => ({
    snapshot: one(infrastructureSnapshots, {
      fields: [infrastructureFacilityRows.snapshotId],
      references: [infrastructureSnapshots.id],
    }),
  }),
);

export const infrastructureProjectRelations = relations(
  infrastructureProjects,
  ({ one }) => ({
    school: one(schools, {
      fields: [infrastructureProjects.schoolId],
      references: [schools.id],
    }),
    academicYear: one(academicYears, {
      fields: [infrastructureProjects.academicYearId],
      references: [academicYears.id],
    }),
    term: one(terms, {
      fields: [infrastructureProjects.termId],
      references: [terms.id],
    }),
  }),
);
