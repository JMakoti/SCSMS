import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { schools } from "./schools";
import { wards } from "./subcounty_ward";

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: text("school_id").references(() => schools.id, { onDelete: "cascade" }),
    wardId: text("ward_id").references(() => wards.id, { onDelete: "cascade" }),
    titleType: text("title_type", {
      enum: ["head_teacher", "deputy", "bursar", "board_chair", "senior_teacher"],
    }).notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phone2: text("phone2"),
    email: text("email"),
    postalAddress: text("postal_address"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    schoolIdx: index("contacts_school_idx").on(table.schoolId),
    wardIdx: index("contacts_ward_idx").on(table.wardId),
    typeIdx: index("contacts_type_idx").on(table.titleType),
  }),
);

export const contactRelations = relations(contacts, ({ one }) => ({
  school: one(schools, {
    fields: [contacts.schoolId],
    references: [schools.id],
  }),
  ward: one(wards, {
    fields: [contacts.wardId],
    references: [wards.id],
  }),
}));
