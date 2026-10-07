import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { contacts } from "./contact";
import { schools } from "./schools";
import { users } from "./user";
import { staff } from "./staff";

export const subcounty = sqliteTable(
  "subcounty",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    county: text("county"),
    countyCode: text("county_code"),
    subCounty: text("sub_county"),
    subCountyCode: text("sub_county_code"),
    constituency: text("constituency"),
    constituencyCode: text("constituency_code"),
    notes: text("notes"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("subcounty_code_idx").on(table.countyCode),
    nameIdx: index("subcounty_name_idx").on(table.subCounty),
  }),
);

export const wards = sqliteTable(
  "wards",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    subCountyId: text("sub_county_id")
      .notNull()
      .references(() => subcounty.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    wardCode: text("ward_code").notNull(),
    wardName: text("ward_name").notNull(),
    notes: text("notes"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),

  },
  (table) => ({
    codeIdx: uniqueIndex("wards_code_idx").on(table.wardCode),
    nameIdx: index("wards_name_idx").on(table.wardName),
    subCountyIdx: index("wards_sub_county_idx").on(
      table.subCountyId,
    ),
  }),
);

export const subCountyRelations = relations(
  subcounty,
  ({ many }) => ({
    wards: many(wards),
  }),
);

export const wardRelations = relations(
  wards,
  ({ one, many }) => ({
    subCounty: one(subcounty, {
      fields: [wards.subCountyId],
      references: [subcounty.id],
    }),

    schools: many(schools),
    contacts: many(contacts),
    users: many(users),
    staff: many(staff),
  }),
);
