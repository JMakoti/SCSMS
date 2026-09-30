import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, pgTable, real, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { academicYears } from "./academicyear";
import { schools } from "./schools";

export const infrastructureSnapshots = pgTable(
  "infrastructure_snapshots",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["draft", "submitted", "verified"],
    })
      .notNull()
      .default("draft"),
    capturedAt: timestamp("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    verifiedAt: timestamp("verified_at"),
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

export const infrastructureFacilityRows = pgTable(
  "infrastructure_facility_rows",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    snapshotId: varchar("snapshot_id", { length: 36 })
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

export const infrastructureProjects = pgTable(
  "infrastructure_projects",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: varchar("academic_year_id", { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
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
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  }),
);
