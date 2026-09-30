import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { wards } from "./subcounty_ward";

export const contacts = pgTable(
  "contacts",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    schoolId: varchar("school_id", { length: 36 }).references(() => schools.id, { onDelete: "cascade" }),
    wardId: varchar("ward_id", { length: 36 }).references(() => wards.id, { onDelete: "cascade" }),
    titleType: text("title_type", {
      enum: ["head_teacher", "deputy", "bursar", "board_chair", "senior_teacher"],
    }).notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    phone2: text("phone2"),
    email: text("email"),
    postalAddress: text("postal_address"),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
