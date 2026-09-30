import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, pgTable, real, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { contacts } from "./contact";
import { enrollmentSnapshots } from "./enrollment";
import { infrastructureProjects, infrastructureSnapshots } from "./infrastructure";
import { performanceRecords } from "./performance";
import { reportRuns } from "./reports";
import { staff } from "./staff";
import { wards } from "./subcounty_ward";

export const schools = pgTable(
  "schools",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolCode: text("school_code").notNull(),
    uicCode: text("uic_code").notNull(),
    nemisCode: text("nemis_code"),
    knecCode: text("knec_code"),
    tscCode: text("tsc_code"),
    registrationNumber: text("registration_number"),
    officialName: text("official_name").notNull(),
    displayName: text("display_name").notNull(),
    institutionType: text("institution_type", {
      enum: ["regular", "intergrated", "special_needs", "comprehensive"],
    }).notNull(),
    level: text("level", {
      enum: ["primary", "junior", "senior"],
    }).notNull(),
    ownershipType: text("ownership_type", {
      enum: ["goverment", "private", "community", "NGO_organization"],
    }).notNull(),
    status: text("status", {
      enum: ["active", "inactive", "closed", "pending_update"],
    })
      .notNull()
      .default("active"),
    registrationstatus: text("registration_status", {
      enum: ["registered", "suspended", "closed", "pending"],
    }),
    boardingType: text("boarding_type", {
      enum: ["day", "boarding", "day_and_boarding"],
    }),
    genderType: text("gender_type", {
      enum: ["male", "boys", "mixed"],
    }),
    titleDeed: text("title_deed", {
      enum: ["yes", "no"],
    }),
    latitude: real("latitude"),
    longitude: real("longitude"),
    wardId: varchar("ward_id", { length: 36 })
      .notNull()
      .references(() => wards.id, { onDelete: "restrict" }),
    location: text("location"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    sne: text("sne", {
      enum: ["yes", "no"],
    }),
    openedOn: text("opened_on"),
    completenessScore: integer("completeness_score").notNull().default(0),
    lastVerifiedAt: timestamp("last_verified_at"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("schools_code_idx").on(table.schoolCode),
    nemisIdx: uniqueIndex("schools_nemis_code_idx").on(table.nemisCode),
    wardIdx: index("schools_ward_idx").on(table.wardId),
    levelIdx: index("schools_level_idx").on(table.level),
    statusIdx: index("schools_status_idx").on(table.status),
  }),
);

export const schoolRelations = relations(schools, ({ one, many }) => ({
  ward: one(wards, {
    fields: [schools.wardId],
    references: [wards.id],
  }),
  contacts: many(contacts),
  staff: many(staff),
  enrollmentSnapshots: many(enrollmentSnapshots),
  infrastructureSnapshots: many(infrastructureSnapshots),
  infrastructureProjects: many(infrastructureProjects),
  performanceRecords: many(performanceRecords),
  reportRuns: many(reportRuns),
}));
