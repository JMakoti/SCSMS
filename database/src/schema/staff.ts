import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { schools } from "./schools";

export const staff = sqliteTable(
  "staff",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    staffNumber: text("staff_number"),
    tscNo: text("tsc_no"),
    schoolId: text("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gender: text("gender", { enum: ["male", "female"] }),
    staffType: text("staff_type", {
      enum: ["teaching", "non_teaching", "administrative"],
    }).notNull(),
    designation: text("designation").notNull(), // official role
    employer: text("employer", {
      enum: ["goverment(TSC)", "county_goverment", "school_board(BOM)", "private_owner", "faith_based_organization", "NGO", "agency"],
    }).notNull(),
    employmentType: text("employment_type", {
      enum: ["permanent", "contract", "temporary", "intern", "volunteer"],
    }).notNull(),
    phone: text("phone"),
    email: text("email"),
    status: text("status", {
      enum: ["active", "transferred", "retired", "inactive"],
    })
      .notNull()
      .default("active"),
    hiredOn: text("hired_on"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    staffNumberIdx: uniqueIndex("staff_number_idx").on(table.staffNumber),
    schoolIdx: index("staff_school_idx").on(table.schoolId),
    typeIdx: index("staff_type_idx").on(table.staffType),
    statusIdx: index("staff_status_idx").on(table.status),
  }),
);

export const staffRelations = relations(staff, ({ one }) => ({
  school: one(schools, {
    fields: [staff.schoolId],
    references: [schools.id],
  }),
}));
